from __future__ import annotations

import csv
import io
import itertools
import math
import re
import statistics
from collections import Counter, defaultdict
from datetime import date, datetime
from pathlib import Path
from typing import Any, Iterable

_RISK_ORDER = {"low": 0, "medium": 1, "high": 2}
_MAX_ROWS_PER_SHEET = 100_000
_HEADER_ALIASES = {
    "transaction_id": {"transactionid", "transactionnumber", "transactionno", "transid", "txnid", "txnumber", "paymentid", "utr", "utrno", "utrnumber", "rrn", "externalid"},
    "date": {"date", "transactiondate", "txndate", "postingdate", "postdate", "valuedate", "invoicedate", "paymentdate", "timestamp", "createdat"},
    "amount": {"amount", "amountinr", "amountinrs", "transactionamount", "txnamount", "paidamount", "totalamount", "value", "netamount"},
    "debit": {"debit", "debitamount", "debitinr", "withdrawal", "withdrawalamount", "withdrawalamt", "paid", "paymentamount"},
    "credit": {"credit", "creditamount", "creditinr", "deposit", "depositamount", "depositamt", "received", "receiptamount"},
    "vendor": {"vendor", "vendorname", "payee", "merchant", "merchantname", "counterparty", "beneficiary", "recipient", "supplier", "customer", "partyname", "particulars", "narration", "description"},
    "reference": {"reference", "referencenumber", "transactionreference", "bankreference", "bankreferenceno", "refno", "invoiceno", "invoicenumber", "invoiceid", "billnumber", "cheque", "chequeno", "chequenumber", "checknumber"},
    "transaction_type": {"transactiontype", "type", "direction", "drcr", "debitcredit"},
}


def _normalize_header(value: Any) -> str:
    return re.sub(r"[^a-z0-9]", "", str(value or "").strip().lower())


def _canonical_header(value: Any) -> str | None:
    normalized = _normalize_header(value)
    return next((name for name, aliases in _HEADER_ALIASES.items() if normalized in aliases), None)


def _parse_amount(value: Any) -> float | None:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (float, int)):
        amount = float(value)
    else:
        raw = str(value).strip()
        if not raw:
            return None
        negative = raw.startswith("(") and raw.endswith(")")
        raw = raw.strip("() ").replace(",", "").replace("₹", "").replace("$", "").replace("€", "").replace("£", "")
        raw = raw.replace("−", "-").replace("–", "-")
        try:
            amount = float(raw)
        except ValueError:
            return None
        if negative:
            amount = -abs(amount)
    return amount if math.isfinite(amount) else None


def _parse_date(value: Any) -> str:
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    raw = str(value or "").strip()
    if not raw:
        return ""
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00")).date().isoformat()
    except ValueError:
        pass
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y", "%Y/%m/%d", "%d.%m.%Y", "%d/%m/%y", "%d-%m-%y"):
        try:
            return datetime.strptime(raw, fmt).date().isoformat()
        except ValueError:
            continue
    return ""


def _row_to_record(headers: list[str | None], values: list[Any], source: str, row_number: int) -> tuple[dict | None, str | None]:
    row = {header: values[index] if index < len(values) else None for index, header in enumerate(headers) if header}
    amount = _parse_amount(row.get("amount"))
    transaction_type = str(row.get("transaction_type") or "payment").strip() or "payment"
    if amount is None:
        debit = _parse_amount(row.get("debit"))
        credit = _parse_amount(row.get("credit"))
        if debit is not None and debit != 0:
            amount, transaction_type = -abs(debit), "debit"
        elif credit is not None and credit != 0:
            amount, transaction_type = abs(credit), "credit"
    date_value = _parse_date(row.get("date"))
    if not date_value:
        return None, f"{source} row {row_number}: missing or invalid date"
    if amount is None:
        return None, f"{source} row {row_number}: missing or invalid amount"
    transaction_id = str(row.get("transaction_id") or "").strip() or f"{source}-ROW-{row_number}"
    return {
        "transaction_id": transaction_id,
        "date": date_value,
        "amount": amount,
        "vendor": str(row.get("vendor") or "").strip(),
        "transaction_type": transaction_type,
        "reference": str(row.get("reference") or "").strip(),
    }, None


def _parse_rows(rows: Iterable[list[Any]], source: str) -> tuple[list[dict], list[str]]:
    iterator = iter(rows)
    prefix: list[list[Any]] = []
    for _ in range(15):
        try:
            prefix.append(next(iterator))
        except StopIteration:
            break
    header_index = None
    canonical_headers: list[str | None] = []
    for index, row in enumerate(prefix):
        headers = [_canonical_header(value) for value in row]
        has_amount = any(header in headers for header in ("amount", "debit", "credit"))
        if has_amount and "date" in headers:
            header_index, canonical_headers = index, headers
            break
    if header_index is None:
        return [], [f"{source}: no transaction table found; include date and amount (or debit/credit) columns"]

    records: list[dict] = []
    errors: list[str] = []
    data_rows = itertools.chain(prefix[header_index + 1 :], iterator)
    for row_number, row in enumerate(data_rows, start=header_index + 2):
        if row_number - (header_index + 1) > _MAX_ROWS_PER_SHEET:
            errors.append(f"{source}: stopped after {_MAX_ROWS_PER_SHEET:,} rows; split the sheet into smaller files")
            break
        if not any(value is not None and str(value).strip() for value in row):
            continue
        record, error = _row_to_record(canonical_headers, row, source, row_number)
        if error:
            errors.append(error)
        elif record:
            records.append(record)
    if not records and not errors:
        errors.append(f"{source}: transaction table has no data rows")
    return records, errors


def parse_transaction_csv(content: bytes) -> tuple[list[dict], list[str]]:
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        return [], ["CSV file is not valid UTF-8 text; export it as UTF-8 CSV and retry"]
    if not text.strip():
        return [], ["CSV file is empty"]
    try:
        dialect = csv.Sniffer().sniff(text[:4096], delimiters=",;\t|")
    except csv.Error:
        dialect = csv.excel
    return _parse_rows(csv.reader(io.StringIO(text), dialect), "CSV")


def parse_transaction_file(content: bytes, filename: str) -> tuple[list[dict], list[str]]:
    suffix = Path(filename).suffix.lower()
    if suffix == ".csv":
        return parse_transaction_csv(content)
    if suffix == ".xlsx":
        try:
            from openpyxl import load_workbook

            workbook = load_workbook(io.BytesIO(content), read_only=True, data_only=True, keep_links=False)
            all_records: list[dict] = []
            all_errors: list[str] = []
            try:
                found_transaction_sheet = False
                for sheet in workbook.worksheets:
                    records, errors = _parse_rows(sheet.iter_rows(values_only=True), f"Sheet '{sheet.title}'")
                    all_records.extend(records)
                    has_table_error = any("no transaction table found" in error for error in errors)
                    found_transaction_sheet = found_transaction_sheet or bool(records) or (bool(errors) and not has_table_error)
                    all_errors.extend(error for error in errors if not has_table_error)
                if not found_transaction_sheet:
                    all_errors.append("Excel workbook: no transaction table found in any worksheet")
            finally:
                workbook.close()
            return all_records, all_errors
        except Exception as exc:
            return [], [f"Excel workbook could not be read: {type(exc).__name__}"]
    if suffix == ".xls":
        try:
            import xlrd

            workbook = xlrd.open_workbook(file_contents=content, on_demand=True)
            all_records: list[dict] = []
            all_errors: list[str] = []
            try:
                found_transaction_sheet = False
                for sheet in workbook.sheets():
                    def row_values():
                        for row_index in range(sheet.nrows):
                            values = []
                            for column_index in range(sheet.ncols):
                                cell = sheet.cell(row_index, column_index)
                                value = cell.value
                                if cell.ctype == xlrd.XL_CELL_DATE:
                                    try:
                                        value = xlrd.xldate_as_datetime(value, workbook.datemode)
                                    except (ValueError, OverflowError):
                                        value = ""
                                values.append(value)
                            yield values

                    records, errors = _parse_rows(row_values(), f"Sheet '{sheet.name}'")
                    all_records.extend(records)
                    has_table_error = any("no transaction table found" in error for error in errors)
                    found_transaction_sheet = found_transaction_sheet or bool(records) or (bool(errors) and not has_table_error)
                    all_errors.extend(error for error in errors if not has_table_error)
                if not found_transaction_sheet:
                    all_errors.append("Excel workbook: no transaction table found in any worksheet")
            finally:
                workbook.release_resources()
            return all_records, all_errors
        except Exception as exc:
            return [], [f"Legacy .xls workbook could not be read: {type(exc).__name__}"]
    return [], ["Unsupported file type. Upload a .csv, .xlsx, or .xls transaction file"]


def _fingerprint(record: dict) -> tuple:
    vendor = re.sub(r"\s+", " ", str(record.get("vendor") or "").strip().lower())
    reference = re.sub(r"\s+", "", str(record.get("reference") or "").strip().lower())
    return (record.get("date", ""), round(abs(record.get("amount") or 0), 2), vendor, reference)


def detect_fraud(records: list[dict]) -> list[dict]:
    id_counts = Counter(str(record.get("transaction_id") or "").strip().casefold() for record in records)
    fingerprint_counts = Counter(_fingerprint(record) for record in records if record.get("vendor") or record.get("reference"))
    reference_counts: dict[str, set[tuple]] = defaultdict(set)
    vendor_amounts: dict[str, list[float]] = defaultdict(list)
    vendor_day_counts: Counter[tuple[str, str]] = Counter()
    for record in records:
        vendor = re.sub(r"\s+", " ", str(record.get("vendor") or "").strip().casefold())
        reference = re.sub(r"\s+", "", str(record.get("reference") or "").strip().casefold())
        amount = _parse_amount(record.get("amount"))
        if vendor and amount is not None:
            vendor_amounts[vendor].append(abs(amount))
            vendor_day_counts[(vendor, str(record.get("date") or ""))] += 1
        if reference:
            reference_counts[reference].add((str(record.get("date") or ""), round(abs(amount or 0), 2), vendor))

    findings_by_record: list[list[dict]] = []
    for record in records:
        findings: list[dict] = []
        transaction_id = str(record.get("transaction_id") or "").strip()
        amount_value = _parse_amount(record.get("amount"))
        amount = abs(amount_value or 0)
        vendor = re.sub(r"\s+", " ", str(record.get("vendor") or "").strip().casefold())
        reference = re.sub(r"\s+", "", str(record.get("reference") or "").strip().casefold())

        def add(level: str, reason: str, method: str, action: str) -> None:
            findings.append({"risk_level": level, "reason": reason, "detection_method": method, "recommended_action": action})

        if transaction_id and id_counts[transaction_id.casefold()] > 1:
            add("high", f"Transaction identifier appears {id_counts[transaction_id.casefold()]} times in the scanned records", "duplicate_identifier", "Reconcile each occurrence with the bank or accounting source before approval")

        if (record.get("vendor") or record.get("reference")) and fingerprint_counts[_fingerprint(record)] > 1:
            add("high", "Same date, amount, vendor and reference combination appears more than once", "duplicate_fingerprint", "Check for duplicate invoice or payment and confirm against source documents")

        if reference and len(reference_counts[reference]) > 1:
            add("high", "The same invoice/reference is associated with different transaction details", "reference_reuse", "Verify the invoice/reference with the supplier and source ledger")

        if vendor and vendor_day_counts[(vendor, str(record.get("date") or ""))] >= 3:
            add("medium", "Three or more payments to the same vendor occur on the same date", "same_day_velocity", "Review the grouped payments, approvals and supporting invoices")

        history = vendor_amounts.get(vendor, [])
        if vendor and len(history) >= 5:
            baseline_values = [value for value in history if value > 0]
            if len(baseline_values) >= 5:
                median = statistics.median(baseline_values)
                if median > 0 and amount >= 3 * median:
                    level = "high" if amount >= 5 * median else "medium"
                    add(level, f"Amount is {amount / median:.1f}x this vendor's median in the scanned data", "vendor_amount_outlier", "Compare with prior invoices, contract terms and an independent vendor contact")

        if amount_value == 0:
            add("low", "Zero-value transaction may be a test, reversal or data-entry artifact", "zero_amount", "Confirm whether this is an intentional test or reversal")

        date_text = str(record.get("date") or "")
        parsed_date = _parse_date(date_text)
        if parsed_date and parsed_date > date.today().isoformat():
            add("medium", "Transaction date is in the future", "future_date", "Verify the date and source file before posting")

        if not vendor:
            add("low", "Counterparty/vendor name is missing, limiting screening", "missing_counterparty", "Match the record to a named counterparty in the source system")

        findings_by_record.append(findings)

    alerts: list[dict] = []
    for record, findings in zip(records, findings_by_record):
        if not findings:
            continue
        top = max(findings, key=lambda item: _RISK_ORDER[item["risk_level"]])
        methods = list(dict.fromkeys(item["detection_method"] for item in findings))
        alerts.append({
            "transaction_id": record.get("transaction_id", ""),
            "amount": record.get("amount"),
            "date": record.get("date", ""),
            "vendor": record.get("vendor", ""),
            "risk_level": top["risk_level"],
            "reason": " | ".join(item["reason"] for item in findings),
            "detection_method": ", ".join(methods),
            "recommended_action": top["recommended_action"],
        })
    return alerts


def summarize_fraud(records: list[dict], alerts: list[dict], reviews: list[dict] | None = None) -> dict:
    review_items = reviews or []
    seen_ids: set[str] = set()
    seen_fingerprints: set[tuple] = set()
    duplicate_rows: set[int] = set()
    for index, item in enumerate(records):
        transaction_id = str(item.get("transaction_id") or "").casefold()
        fingerprint = _fingerprint(item)
        if transaction_id and transaction_id in seen_ids:
            duplicate_rows.add(index)
        if (item.get("vendor") or item.get("reference")) and fingerprint in seen_fingerprints:
            duplicate_rows.add(index)
        if transaction_id:
            seen_ids.add(transaction_id)
        if item.get("vendor") or item.get("reference"):
            seen_fingerprints.add(fingerprint)
    duplicate_count = len(duplicate_rows)
    return {
        "total_transactions": len(records),
        "suspicious_transactions": len({alert.get("transaction_id") for alert in alerts if alert.get("transaction_id")}),
        "high_risk_alerts": sum(1 for alert in alerts if alert.get("risk_level") == "high"),
        "duplicate_count": duplicate_count,
        "risk_distribution": dict(Counter(alert.get("risk_level", "low") for alert in alerts)),
        "status_distribution": dict(Counter(alert.get("status", "open") for alert in alerts)),
        "alerts": alerts,
        "review_history": review_items,
    }
