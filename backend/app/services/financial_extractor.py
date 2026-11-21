"""
Financial Statement Extractor
-----------------------------
Extracts multi-period structured financial statements (Income Statement,
Balance Sheet, Cash Flow, and Key Metrics) from uploaded Excel and CSV files.
Supports:
  1. Screener.in export format (e.g., Reliance Industries, TCS, Tata Motors)
  2. FinSight synthetic business datasets (Annual P&L, Balance Sheet, Cash Flow Summary)
  3. Standard 3-statement models (Income_Statement, Balance_Sheet, etc.)
  4. General tabular financial sheets
"""
from __future__ import annotations

import csv
import io
import json
import re
from typing import Any
import openpyxl


def _to_float(val: Any, default: float = 0.0) -> float:
    if val is None:
        return default
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip().replace(",", "").replace("₹", "").replace("$", "")
    try:
        return float(s)
    except (ValueError, TypeError):
        return default


def _clean_str(val: Any) -> str:
    if val is None:
        return ""
    if hasattr(val, "isoformat"):
        return val.isoformat()[:10]
    return str(val).strip()


def extract_financial_records_from_workbook(
    raw: bytes, filename: str, extracted_text: str = ""
) -> tuple[str, list[dict[str, Any]], list[dict[str, Any]]]:
    """
    Parse any Excel, CSV, or financial document and extract structured financial records.
    Supports:
        1. Screener.in corporate exports (multi-period, multi-sheet)
        2. Synthetic ERP / FinSight datasets
        3. Standard 3-statement models
        4. General single-sheet and multi-sheet Excel files
        5. CSV exports (row-oriented or column-oriented)
        6. Tabular text extracted from PDF, DOCX, or text files
    Returns:
        (company_name, list_of_financial_records, list_of_cashflow_records)
    """
    lower_fn = filename.lower()

    # 1. CSV Format
    if lower_fn.endswith(".csv"):
        company_name, records, cashflows = _extract_csv_format(raw, filename)
        if records:
            return company_name, records, cashflows

    # 2. Excel Format
    if lower_fn.endswith((".xlsx", ".xlsm", ".xltx", ".xltm", ".xls")):
        try:
            wb = openpyxl.load_workbook(io.BytesIO(raw), data_only=True, read_only=True)
            sheet_names = wb.sheetnames
            lower_sheets = {s.lower(): s for s in sheet_names}

            # 2a. Screener format
            is_screener = (
                any(k in lower_sheets for k in ("income_statement", "income statement", "profit & loss", "p&l"))
                and any(k in lower_sheets for k in ("balance_sheet", "balance sheet"))
                and any(k in lower_sheets for k in ("data sheet", "quarters", "customization"))
            )
            if is_screener:
                company_name, records, cashflows = _extract_screener_format(wb, lower_sheets)
                wb.close()
                if records:
                    return company_name, records, cashflows

            # 2b. Synthetic / ERP format
            if any("annual p&l" in s for s in lower_sheets) or (
                "p&l" in lower_sheets and "balance sheet" in lower_sheets
            ):
                company_name, records, cashflows = _extract_synthetic_format(wb, lower_sheets)
                wb.close()
                if records:
                    return company_name, records, cashflows

            # 2c. 3-statement format
            if ("income_statement" in lower_sheets or "income statement" in lower_sheets) and (
                "balance_sheet" in lower_sheets or "balance sheet" in lower_sheets
            ):
                company_name, records, cashflows = _extract_three_statement_format(wb, lower_sheets)
                wb.close()
                if records:
                    return company_name, records, cashflows

            # 2d. General tabular Excel format (any sheet with financials)
            company_name, records, cashflows = _extract_general_excel_format(wb, sheet_names, filename)
            wb.close()
            if records:
                return company_name, records, cashflows

        except Exception:
            pass

    # 3. Fallback: Parse tabular text from PDF, DOCX, or text files
    if extracted_text:
        company_name, records, cashflows = _extract_from_tabular_text(extracted_text, filename)
        if records:
            return company_name, records, cashflows

    return "", [], []


def _extract_from_table_rows(
    rows: list[list[str]], company_name: str, filename: str
) -> tuple[str, list[dict[str, Any]], list[dict[str, Any]]]:
    if not rows or len(rows) < 2:
        return company_name, [], []

    header = [c.lower() for c in rows[0]]

    col_metric_terms = {
        "revenue": ("revenue", "sales", "turnover", "total income"),
        "cogs": ("cogs", "cost of goods", "cost of sales"),
        "operating_expenses": ("operating expenses", "opex", "total expenses", "expenses"),
        "net_income": ("net income", "net profit", "pat", "profit after tax", "profit / (loss)", "net loss"),
        "total_assets": ("total assets", "assets", "balance sheet total"),
        "total_liabilities": ("total liabilities",),
        "borrowings": ("borrowings", "total borrowings", "total debt", "interest-bearing debt"),
        "cash": ("cash & bank", "cash and bank", "cash", "bank balance", "closing cash"),
        "operating_cash_flow": ("cash from operating", "operating cash flow", "cash flow from operations"),
        "total_equity": ("total equity", "shareholders equity", "net worth", "share capital"),
    }

    # Orientation 1: Columnar (rows are periods, columns are metrics)
    col_idx_map: dict[str, int] = {}
    period_col_idx = 0
    for idx, col_name in enumerate(header):
        if any(k in col_name for k in ("period", "date", "year", "fy", "quarter")):
            period_col_idx = idx
            continue
        for metric_key, terms in col_metric_terms.items():
            if metric_key not in col_idx_map and any(t in col_name for t in terms):
                col_idx_map[metric_key] = idx
                break

    if "revenue" in col_idx_map or "total_assets" in col_idx_map:
        records: list[dict[str, Any]] = []
        cashflows: list[dict[str, Any]] = []
        for r in rows[1:]:
            if len(r) <= max(col_idx_map.values(), default=0):
                continue
            period = r[period_col_idx] if len(r) > period_col_idx else f"Period {len(records)+1}"
            if not period:
                continue
            rev = _to_float(r[col_idx_map["revenue"]]) if "revenue" in col_idx_map else 0.0
            cogs = _to_float(r[col_idx_map["cogs"]]) if "cogs" in col_idx_map else None
            opex = _to_float(r[col_idx_map["operating_expenses"]]) if "operating_expenses" in col_idx_map else None
            net = _to_float(r[col_idx_map["net_income"]]) if "net_income" in col_idx_map else None
            assets = _to_float(r[col_idx_map["total_assets"]]) if "total_assets" in col_idx_map else None
            liab = _to_float(r[col_idx_map["total_liabilities"]]) if "total_liabilities" in col_idx_map else None
            borrowings = _to_float(r[col_idx_map["borrowings"]]) if "borrowings" in col_idx_map else None
            cash = _to_float(r[col_idx_map["cash"]]) if "cash" in col_idx_map else None
            cfo = _to_float(r[col_idx_map["operating_cash_flow"]]) if "operating_cash_flow" in col_idx_map else None
            eq = _to_float(r[col_idx_map["total_equity"]]) if "total_equity" in col_idx_map else None

            records.append({
                "period": period,
                "revenue": rev,
                "cogs": cogs,
                "operating_expenses": opex,
                "net_income": net,
                "total_assets": assets,
                "total_liabilities": liab,
                "short_term_debt": 0.0 if borrowings is not None else None,
                "long_term_debt": borrowings,
                "cash": cash,
                "closing_cash": cash,
                "operating_cash_flow": cfo,
                "net_cash_flow": None,
                "total_equity": eq,
                "total_current_assets": None,
                "total_current_liabilities": None,
                "accounts_receivable": None,
                "inventory": None,
                "ebit": None,
                "interest_expense": None,
                "notes": f"Extracted from {filename}",
            })
            if cfo is not None or cash is not None:
                cashflows.append({
                    "period": period,
                    "inflow": max(0.0, cfo or 0.0),
                    "outflow": abs(min(0.0, cfo or 0.0)),
                    "closing_cash": cash or 0.0,
                })
        if records:
            return company_name, records, cashflows

    # Orientation 2: Row-oriented (rows are line items, columns are periods)
    period_row_idx = -1
    period_cols: list[tuple[int, str]] = []
    for r_idx, r in enumerate(rows[:5]):
        matches = [(c_idx, val) for c_idx, val in enumerate(r) if re.search(r"(?:20\d\d|FY\s*\d\d|Q[1-4]\s*20\d\d|Mar\s*20\d\d)", val, re.IGNORECASE)]
        if len(matches) >= 2:
            period_row_idx = r_idx
            period_cols = matches
            break

    if period_cols:
        row_map: dict[str, dict[int, float]] = {}
        for r in rows[period_row_idx+1:]:
            if not r or not r[0].strip():
                continue
            lbl = r[0].strip().lower()
            row_map[lbl] = {c_idx: _to_float(r[c_idx]) for c_idx, _ in period_cols if c_idx < len(r)}

        def get_row_val(terms: tuple[str, ...], c_idx: int) -> float | None:
            for lbl, vals in row_map.items():
                if any(t in lbl for t in terms):
                    if c_idx in vals:
                        return vals[c_idx]
            return None

        records = []
        cashflows = []
        for c_idx, p_name in period_cols:
            rev = get_row_val(("sales", "revenue", "turnover", "total income"), c_idx) or 0.0
            cogs = get_row_val(("cogs", "cost of goods", "raw material"), c_idx)
            opex = get_row_val(("operating expenses", "expenses", "opex"), c_idx)
            net = get_row_val(("net profit", "pat", "net income", "profit after tax"), c_idx)
            assets = get_row_val(("total assets", "assets", "balance sheet total"), c_idx)
            liab = get_row_val(("total liabilities",), c_idx)
            borrowings = get_row_val(("borrowings", "total debt", "interest-bearing debt"), c_idx)
            cash = get_row_val(("cash & bank", "cash and bank", "cash", "bank balance"), c_idx)
            cfo = get_row_val(("cash from operating", "operating cash flow", "cash flow from operations"), c_idx)
            eq = get_row_val(("total equity", "equity share capital", "share capital", "shareholders equity", "net worth"), c_idx)

            records.append({
                "period": p_name,
                "revenue": rev,
                "cogs": cogs,
                "operating_expenses": opex,
                "net_income": net,
                "total_assets": assets,
                "total_liabilities": liab,
                "short_term_debt": 0.0 if borrowings is not None else None,
                "long_term_debt": borrowings,
                "cash": cash,
                "closing_cash": cash,
                "operating_cash_flow": cfo,
                "net_cash_flow": None,
                "total_equity": eq,
                "total_current_assets": None,
                "total_current_liabilities": None,
                "accounts_receivable": None,
                "inventory": None,
                "ebit": None,
                "interest_expense": None,
                "notes": f"Extracted from {filename}",
            })
            if cfo is not None or cash is not None:
                cashflows.append({
                    "period": p_name,
                    "inflow": max(0.0, cfo or 0.0),
                    "outflow": abs(min(0.0, cfo or 0.0)),
                    "closing_cash": cash or 0.0,
                })
        if records:
            return company_name, records, cashflows

    return company_name, [], []


def _extract_csv_format(
    raw: bytes, filename: str
) -> tuple[str, list[dict[str, Any]], list[dict[str, Any]]]:
    company_name = re.sub(r"\.[^.]+$", "", filename).replace("_", " ").replace("-", " ").strip()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            text = raw.decode("latin-1")
        except Exception:
            return company_name, [], []

    lines = [l for l in text.splitlines() if l.strip()]
    if not lines:
        return company_name, [], []

    delimiter = ","
    if "\t" in lines[0] and lines[0].count("\t") > lines[0].count(","):
        delimiter = "\t"
    elif ";" in lines[0] and lines[0].count(";") > lines[0].count(","):
        delimiter = ";"

    reader = list(csv.reader(io.StringIO(text), delimiter=delimiter))
    rows = [[c.strip() for c in r] for r in reader if any(c.strip() for c in r)]
    if not rows:
        return company_name, [], []

    # Check if first row is company name
    if len(rows[0]) == 1 or (len(rows[0]) > 1 and not any(c.isdigit() for c in rows[0])):
        first_cell = rows[0][0].strip()
        if any(term in first_cell.lower() for term in ("ltd", "limited", "inc", "corp", "pvt", "company", "enterprises")):
            company_name = first_cell
            rows = rows[1:]

    return _extract_from_table_rows(rows, company_name, filename)


def _extract_general_excel_format(
    wb: openpyxl.Workbook, sheet_names: list[str], filename: str
) -> tuple[str, list[dict[str, Any]], list[dict[str, Any]]]:
    company_name = re.sub(r"\.[^.]+$", "", filename).replace("_", " ").replace("-", " ").strip()
    for s_name in sheet_names:
        ws = wb[s_name]
        max_r = min(ws.max_row, 200)
        max_c = min(ws.max_column, 50)
        if max_r < 2 or max_c < 2:
            continue
        rows = [
            [_clean_str(ws.cell(r, c).value) for c in range(1, max_c + 1)]
            for r in range(1, max_r + 1)
        ]
        rows = [r for r in rows if any(r)]
        c_name, records, cashflows = _extract_from_table_rows(rows, company_name, filename)
        if records:
            return c_name, records, cashflows
    return company_name, [], []


def _extract_from_tabular_text(
    text: str, filename: str
) -> tuple[str, list[dict[str, Any]], list[dict[str, Any]]]:
    company_name = re.sub(r"\.[^.]+$", "", filename).replace("_", " ").replace("-", " ").strip()
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    if not lines:
        return company_name, [], []
    rows: list[list[str]] = []
    for l in lines:
        if "|" in l:
            tokens = [t.strip() for t in l.split("|") if t.strip()]
            if tokens:
                rows.append(tokens)
        elif "\t" in l:
            tokens = [t.strip() for t in l.split("\t") if t.strip()]
            if tokens:
                rows.append(tokens)
    if rows:
        return _extract_from_table_rows(rows, company_name, filename)
    return company_name, [], []


def _extract_screener_format(
    wb: openpyxl.Workbook, lower_sheets: dict[str, str]
) -> tuple[str, list[dict[str, Any]], list[dict[str, Any]]]:
    company_name = ""
    if "data sheet" in lower_sheets:
        ds = wb[lower_sheets["data sheet"]]
        for r in range(1, min(5, ds.max_row + 1)):
            value = ds.cell(r, 2).value
            if value and str(value).strip() and not str(value).strip().startswith("http"):
                company_name = str(value).strip()
                break

    inc_key = next((k for k in ("income_statement", "income statement", "profit & loss", "p&l") if k in lower_sheets), None)
    bs_key = next((k for k in ("balance_sheet", "balance sheet") if k in lower_sheets), None)
    cf_key = next((k for k in ("cash flow", "cash_flow", "cashflow") if k in lower_sheets), None)
    if not inc_key or not bs_key:
        return company_name, [], []
    ws_inc, ws_bs = wb[lower_sheets[inc_key]], wb[lower_sheets[bs_key]]
    ws_cf = wb[lower_sheets[cf_key]] if cf_key else None
    if not company_name and ws_inc.cell(1, 1).value:
        company_name = str(ws_inc.cell(1, 1).value).strip()

    cols = []
    for c in range(2, ws_inc.max_column + 1):
        raw_period = ws_inc.cell(3, c).value
        if raw_period is not None:
            period = _clean_str(raw_period)
            if period and not any(x in period.lower() for x in ("trailing", "best case", "worst case")):
                cols.append((c, period))
    if not cols:
        if "data sheet" in lower_sheets:
            return _extract_from_data_sheet(wb[lower_sheets["data sheet"]])
        return company_name, [], []

    def map_rows(ws: Any | None) -> dict[str, dict[int, Any]]:
        out: dict[str, dict[int, Any]] = {}
        if ws is not None:
            for r in range(1, ws.max_row + 1):
                label = str(ws.cell(r, 1).value or "").strip().lower()
                if label:
                    out[label] = {c: ws.cell(r, c).value for c, _ in cols}
        return out

    inc_rows, bs_rows, cf_rows = map_rows(ws_inc), map_rows(ws_bs), map_rows(ws_cf)
    ds_rows: dict[str, dict[int, Any]] = {}
    if "data sheet" in lower_sheets:
        ds = wb[lower_sheets["data sheet"]]
        for r in range(1, ds.max_row + 1):
            label = str(ds.cell(r, 1).value or "").strip().lower()
            if label:
                ds_rows[label] = {c: ds.cell(r, c).value for c, _ in cols}

    def val(rows: dict[str, dict[int, Any]], labels: tuple[str, ...], col: int) -> float | None:
        for label in labels:
            raw = rows.get(label, {}).get(col)
            if raw is not None and str(raw).strip() != "":
                return _to_float(raw)
        return None

    records: list[dict[str, Any]] = []
    cashflows: list[dict[str, Any]] = []
    for c, period in cols:
        revenue = val(inc_rows, ("sales", "revenue", "turnover"), c) or 0.0
        net_profit = val(inc_rows, ("net profit", "net income", "profit after tax", "pat"), c) or 0.0
        expenses = val(inc_rows, ("operating expenses",), c)
        operating_profit = val(inc_rows, ("operating profit", "operating income", "ebit"), c)
        cogs = val(inc_rows, ("cogs", "cost of sales", "cost of goods sold", "cost of goods"), c)
        interest = val(inc_rows, ("interest", "interest expense"), c)

        share_capital = val(bs_rows, ("equity share capital", "share capital"), c) or 0.0
        reserves = val(bs_rows, ("reserves",), c) or 0.0
        equity = val(bs_rows, ("total equity", "shareholders' equity", "net worth"), c)
        if equity is None and (share_capital or reserves):
            equity = share_capital + reserves
        borrowings = val(bs_rows, ("borrowings", "total borrowings", "total debt", "interest-bearing debt"), c)
        other_liabilities = val(bs_rows, ("other liabilities", "other liability"), c)
        total_liabilities = val(bs_rows, ("total liabilities",), c)
        assets = val(bs_rows, ("total assets", "balance sheet total", "total"), c)
        # Some corporate exports report liabilities as the sum of Borrowings
        # and Other Liabilities, without a row literally named "Total
        # Liabilities". This is an exact, auditable line-item sum.
        liabilities_formula = None
        if total_liabilities is None and borrowings is not None and other_liabilities is not None:
            total_liabilities = borrowings + other_liabilities
            liabilities_formula = "Borrowings + Other Liabilities"
        elif total_liabilities is None and assets is not None and equity is not None:
            # Use the balance-sheet identity only when the workbook gives no
            # liabilities total or its two liability components.
            total_liabilities = assets - equity
            liabilities_formula = "Total Assets - Shareholders' Equity"

        cash = val(ds_rows, ("cash & bank", "cash and bank", "cash"), c)
        if cash is None:
            cash = val(bs_rows, ("cash & bank", "cash and bank", "cash"), c)
        receivables = val(bs_rows, ("receivables", "debtors", "trade receivables"), c)
        inventory = val(bs_rows, ("inventory", "inventories"), c)
        current_assets = val(bs_rows, ("total current assets", "current assets"), c)
        current_liabilities = val(bs_rows, ("total current liabilities", "current liabilities"), c)

        cfo = val(cf_rows, ("cash from operating activity", "operating cash flow"), c)
        cfi = val(cf_rows, ("cash from investing activity", "investing cash flow"), c)
        cff = val(cf_rows, ("cash from financing activity", "financing cash flow"), c)
        net_cf = val(cf_rows, ("net cash flow",), c)
        if net_cf is None and all(x is not None for x in (cfo, cfi, cff)):
            net_cf = sum(x or 0.0 for x in (cfo, cfi, cff))

        records.append({
            "period": period, "revenue": revenue, "cogs": cogs,
            "operating_expenses": expenses, "net_income": net_profit,
            "total_assets": assets, "total_liabilities": total_liabilities,
            "total_equity": equity, "total_current_assets": current_assets,
            "total_current_liabilities": current_liabilities, "cash": cash,
            "closing_cash": cash, "accounts_receivable": receivables,
            "inventory": inventory,
            "short_term_debt": None,
            "long_term_debt": borrowings, "interest_expense": interest,
            "ebit": operating_profit, "operating_cash_flow": cfo,
            "investing_cash_flow": cfi, "financing_cash_flow": cff,
            "net_cash_flow": net_cf,
            "notes": (
                f"Extracted from Screener.in sheet for {company_name}"
                + (f"; total_liabilities calculated as {liabilities_formula}" if liabilities_formula else "")
            ),
        })
        if any(x is not None for x in (cfo, cfi, cff, net_cf, cash)):
            cashflows.append({
                "period": period, "inflow": max(0.0, cfo or 0.0),
                "outflow": abs(min(0.0, cfo or 0.0)) + abs(min(0.0, cfi or 0.0)),
                "net": net_cf, "closing_cash": cash or 0.0,
            })
    return company_name, records, cashflows


def _extract_from_data_sheet(
    ds: Any,
) -> tuple[str, list[dict[str, Any]], list[dict[str, Any]]]:
    company_name = str(ds.cell(1, 2).value or "").strip() or "Indian Enterprise"

    # Scan all rows in Data Sheet and group into sections
    sections: dict[str, dict[str, int]] = {
        "pnl": {},
        "bs": {},
        "cf": {},
    }
    current_sec = "pnl"
    for r in range(1, ds.max_row + 1):
        v = str(ds.cell(r, 1).value or "").strip()
        v_upper = v.upper()
        if "PROFIT & LOSS" in v_upper or "INCOME STATEMENT" in v_upper:
            current_sec = "pnl"
            continue
        elif "BALANCE SHEET" in v_upper:
            current_sec = "bs"
            continue
        elif "CASH FLOW" in v_upper:
            current_sec = "cf"
            continue
        elif "QUARTERS" in v_upper:
            current_sec = "quarters"
            continue

        if v and current_sec in sections:
            lbl_clean = v.lower()
            # Some statement exports contain a "Total" at the end of both
            # sides of the balance sheet. Prefer the final total row, which
            # is the total-assets side in this layout.
            if lbl_clean not in sections[current_sec] or (current_sec == "bs" and lbl_clean == "total"):
                sections[current_sec][lbl_clean] = r

    # Determine P&L period columns from the row with 'report date' in pnl section
    report_date_row = sections["pnl"].get("report date") or sections["pnl"].get("narration")
    if not report_date_row:
        for r in range(1, ds.max_row + 1):
            if "report date" in str(ds.cell(r, 1).value or "").lower():
                report_date_row = r
                break

    if not report_date_row:
        return company_name, [], []

    cols: list[tuple[int, str]] = []
    for c in range(2, ds.max_column + 1):
        v = ds.cell(report_date_row, c).value
        if v:
            s = v.isoformat()[:10] if hasattr(v, "isoformat") else str(v)[:10]
            if s and "report" not in s.lower() and "trailing" not in s.lower():
                cols.append((c, s))

    if not cols:
        return company_name, [], []

    def get_row(sec_name: str, label_keywords: tuple[str, ...]) -> int | None:
        sec = sections.get(sec_name, {})
        # Prefer exact line-item labels so "Other Current Assets" cannot be
        # mistaken for the total "Current Assets" row.
        for kw in label_keywords:
            if kw in sec:
                return sec[kw]
        for kw in label_keywords:
            for lbl, r_idx in sec.items():
                if lbl.startswith(kw + " "):
                    return r_idx
        return None

    r_sales = get_row("pnl", ("sales", "revenue", "turnover"))
    r_net_profit = get_row("pnl", ("net profit", "pat", "profit after tax"))
    r_pbt = get_row("pnl", ("profit before tax", "pbt"))
    r_tax = get_row("pnl", ("tax",))
    r_depr = get_row("pnl", ("depreciation",))
    r_int = get_row("pnl", ("interest",))

    r_eq_cap = get_row("bs", ("equity share capital", "share capital", "equity capital"))
    r_reserves = get_row("bs", ("reserves",))
    r_borrowings = get_row("bs", ("borrowings", "total borrowings", "loans", "total debt", "interest-bearing debt"))
    r_other_liab = get_row("bs", ("other liabilities",))
    r_total_assets = get_row("bs", ("total assets", "balance sheet total", "total"))
    r_current_assets = get_row("bs", ("total current assets", "current assets"))
    r_current_liabilities = get_row("bs", ("total current liabilities", "current liabilities"))
    r_cogs = get_row("pnl", ("cost of sales", "cost of goods sold", "cogs"))
    r_operating_profit = get_row("pnl", ("operating profit", "operating income", "ebit"))
    r_cash = get_row("bs", ("cash & bank", "cash and bank", "cash"))
    r_debtors = get_row("bs", ("receivables", "debtors", "trade receivables"))
    r_inventory = get_row("bs", ("inventory", "inventories"))

    r_cfo = get_row("cf", ("cash from operating activity", "operating cash flow", "cash from operations"))
    r_cfi = get_row("cf", ("cash from investing activity", "investing cash flow"))
    r_cff = get_row("cf", ("cash from financing activity", "financing cash flow"))
    r_net_cf = get_row("cf", ("net cash flow",))

    # Broad asset/liability categories do not establish working-capital totals.
    has_reported_wc = bool(r_current_assets and r_current_liabilities)

    records: list[dict[str, Any]] = []
    cashflows: list[dict[str, Any]] = []

    for c, period_str in cols:
        def optional_cell(row: int | None) -> float | None:
            if row is None:
                return None
            raw = ds.cell(row, c).value
            return _to_float(raw) if raw is not None and str(raw).strip() else None

        sales = optional_cell(r_sales)
        net_profit = optional_cell(r_net_profit)
        interest = optional_cell(r_int)
        eq_cap = optional_cell(r_eq_cap)
        reserves = optional_cell(r_reserves)
        equity = eq_cap + reserves if eq_cap is not None and reserves is not None else None
        borrowings = optional_cell(r_borrowings)
        other_liab = optional_cell(r_other_liab)
        total_assets = optional_cell(r_total_assets)
        cash = optional_cell(r_cash)
        debtors = optional_cell(r_debtors)
        inv_val = optional_cell(r_inventory)

        cfo = optional_cell(r_cfo)
        cfi = optional_cell(r_cfi)
        cff = optional_cell(r_cff)
        components = (cfo, cfi, cff)
        net_cf = optional_cell(r_net_cf) if r_net_cf else (sum(x for x in components if x is not None) if all(x is not None for x in components) else None)

        def source_ref(row: int | None) -> str:
            if row is None:
                return "not reported"
            return f"Data Sheet!{openpyxl.utils.get_column_letter(c)}{row}"

        source_refs = {
            "revenue": source_ref(r_sales),
            "net_income": source_ref(r_net_profit),
            "total_assets": source_ref(r_total_assets),
            "total_liabilities": (
                f"{source_ref(r_borrowings)} + {source_ref(r_other_liab)}"
                if r_borrowings is not None and r_other_liab is not None
                else "not reported as a total"
            ),
            "total_equity": (
                f"{source_ref(r_eq_cap)} + {source_ref(r_reserves)}"
                if r_eq_cap is not None and r_reserves is not None
                else "not reported as a total"
            ),
            "borrowings": source_ref(r_borrowings),
            "cash": source_ref(r_cash),
            "inventory": source_ref(r_inventory),
            "total_current_assets": source_ref(r_current_assets),
            "total_current_liabilities": source_ref(r_current_liabilities),
            "cogs": source_ref(r_cogs),
            "operating_profit": source_ref(r_operating_profit),
            "operating_cash_flow": source_ref(r_cfo),
            "investing_cash_flow": source_ref(r_cfi),
            "financing_cash_flow": source_ref(r_cff),
            "net_cash_flow": source_ref(r_net_cf),
        }

        # Never infer operating profit or cost of sales from unrelated totals.
        ebit = optional_cell(r_operating_profit)
        cogs = optional_cell(r_cogs)
        operating_expenses = None

        # Check if balance sheet has reported working capital components (banks report total assets/liabilities without breakdown)
        if not has_reported_wc:
            total_cur_assets = None
            total_cur_liab = None
        else:
            total_cur_assets = _to_float(ds.cell(r_current_assets, c).value) if r_current_assets and ds.cell(r_current_assets, c).value is not None else None
            total_cur_liab = _to_float(ds.cell(r_current_liabilities, c).value) if r_current_liabilities and ds.cell(r_current_liabilities, c).value is not None else None

        records.append({
            "period": period_str,
            "revenue": sales,
            "cogs": cogs,
            "operating_expenses": operating_expenses,
            "net_income": net_profit,
            "total_assets": total_assets,
            "total_liabilities": other_liab + borrowings if other_liab is not None and borrowings is not None else None,
            "total_equity": equity,
            "total_current_assets": total_cur_assets,
            "total_current_liabilities": total_cur_liab,
            "cash": cash,
            "closing_cash": cash,
            "accounts_receivable": debtors,
            "inventory": inv_val,
            "short_term_debt": None,
            "long_term_debt": borrowings,
            "interest_expense": interest,
            "ebit": ebit,
            "operating_cash_flow": cfo,
            "investing_cash_flow": cfi,
            "financing_cash_flow": cff,
            "net_cash_flow": net_cf,
            "notes": (
                f"Extracted from corporate filing for {company_name or 'the uploaded document'}; "
                f"source_refs={json.dumps(source_refs, ensure_ascii=False, sort_keys=True)}"
            ),
        })

        if any(value is not None for value in (cfo, cfi, cff, net_cf, cash)):
            cashflows.append({
                "period": period_str,
                "opening_cash": None,
                "operating_inflow": max(0.0, cfo) if cfo is not None else None,
                "operating_outflow": abs(min(0.0, cfo)) if cfo is not None else None,
                "investing_inflow": max(0.0, cfi) if cfi is not None else None,
                "investing_outflow": abs(cfi) if cfi is not None and cfi < 0 else (0.0 if cfi is not None else None),
                "financing_inflow": max(0.0, cff) if cff is not None else None,
                "financing_outflow": abs(cff) if cff is not None and cff < 0 else (0.0 if cff is not None else None),
                "closing_cash": cash,
                "net": net_cf,
                "notes": "Cash flow values extracted from reported statement rows.",
            })

    return company_name, records, cashflows


def _extract_synthetic_format(
    wb: openpyxl.Workbook, lower_sheets: dict[str, str]
) -> tuple[str, list[dict[str, Any]], list[dict[str, Any]]]:
    company_name = ""
    if "start here" in lower_sheets:
        ws_start = wb[lower_sheets["start here"]]
        for r in range(1, min(10, ws_start.max_row + 1)):
            v = str(ws_start.cell(r, 1).value or "")
            if "company" in v.lower() and ":" in v:
                company_name = v.split(":")[-1].strip()
                break

    pnl_sheet_name = next((s for k, s in lower_sheets.items() if "annual p&l" in k or "p&l" in k), None)
    if not pnl_sheet_name:
        return company_name, [], []

    ws_pnl = wb[pnl_sheet_name]
    ws_bs = next((wb[s] for k, s in lower_sheets.items() if "balance sheet" in k), None)
    ws_cf = next((wb[s] for k, s in lower_sheets.items() if "cash flow" in k), None)

    # Balance sheet snapshot
    bs_data: dict[str, float] = {}
    if ws_bs:
        for r in range(1, ws_bs.max_row + 1):
            acct = str(ws_bs.cell(r, 2).value or "").strip()
            raw_amount = ws_bs.cell(r, 3).value
            amt = _to_float(raw_amount) if raw_amount is not None else None
            if acct and amt is not None:
                bs_data[acct] = amt

    # Cash flow lookup by FY
    cf_data: dict[str, dict[str, float]] = {}
    if ws_cf:
        for r in range(1, ws_cf.max_row + 1):
            fy = str(ws_cf.cell(r, 1).value or "").strip()
            if fy.startswith("FY"):
                cf_data[fy] = {
                    "collections": _to_float(ws_cf.cell(r, 2).value),
                    "supplier_pmt": _to_float(ws_cf.cell(r, 3).value),
                    "operating_pmt": _to_float(ws_cf.cell(r, 4).value),
                    "net_op_cash": _to_float(ws_cf.cell(r, 5).value),
                    "closing_cash": _to_float(ws_cf.cell(r, 6).value),
                }

    records: list[dict[str, Any]] = []
    cashflows: list[dict[str, Any]] = []

    for r in range(1, ws_pnl.max_row + 1):
        period = str(ws_pnl.cell(r, 1).value or "").strip()
        if not period.startswith("FY"):
            continue

        rev = _to_float(ws_pnl.cell(r, 2).value)
        cogs = _to_float(ws_pnl.cell(r, 3).value)
        gp = _to_float(ws_pnl.cell(r, 4).value)
        opex = _to_float(ws_pnl.cell(r, 5).value)
        net_inc = _to_float(ws_pnl.cell(r, 6).value) if ws_pnl.cell(r, 6).value is not None else None

        cash = bs_data.get("Cash and Cash Equivalents")
        ar = bs_data.get("Trade Receivables (illustrative closing)")
        inv = bs_data.get("Inventory (illustrative closing)")
        ppe = bs_data.get("Property, Plant & Equipment (net)")
        oca = bs_data.get("Other Current Assets")
        ap = bs_data.get("Trade Payables (illustrative closing)")
        loans = bs_data.get("Outstanding Loans")
        accrued = bs_data.get("Accrued Expenses")

        cur_assets = None
        cur_liab = None
        tot_assets = bs_data.get("Total Assets")
        tot_liab = bs_data.get("Total Liabilities")
        tot_eq = bs_data.get("Total Equity")

        cf_entry = cf_data.get(period, {})
        closing_c = cf_entry.get("closing_cash", cash)
        op_cf = cf_entry.get("net_op_cash")

        rec = {
            "period": period,
            "revenue": rev,
            "cogs": cogs,
            "operating_expenses": opex,
            "net_income": net_inc,
            "total_assets": tot_assets,
            "total_liabilities": tot_liab,
            "total_equity": tot_eq,
            "total_current_assets": cur_assets,
            "total_current_liabilities": cur_liab,
            "cash": closing_c,
            "closing_cash": closing_c,
            "accounts_receivable": ar,
            "inventory": inv,
            "other_current_assets": oca,
            "short_term_debt": None,
            "long_term_debt": loans,
            "interest_expense": None,
            "ebit": None,
            "operating_cash_flow": op_cf,
            "investing_cash_flow": None,
            "financing_cash_flow": None,
            "notes": f"Extracted from ERP dataset for {company_name or 'the uploaded document'}",
        }
        records.append(rec)

        if cf_entry:
            cashflows.append({
                "period": period,
                "inflow": cf_entry.get("collections"),
                "outflow": (cf_entry.get("supplier_pmt") or 0.0) + (cf_entry.get("operating_pmt") or 0.0),
                "net": op_cf,
                "closing_cash": closing_c,
            })

    return company_name, records, cashflows


def _extract_three_statement_format(
    wb: openpyxl.Workbook, lower_sheets: dict[str, str]
) -> tuple[str, list[dict[str, Any]], list[dict[str, Any]]]:
    company_name = "FinSight Enterprise"
    inc_name = lower_sheets.get("income_statement") or lower_sheets.get("income statement")
    bs_name = lower_sheets.get("balance_sheet") or lower_sheets.get("balance sheet")
    if not inc_name or not bs_name:
        return company_name, [], []

    ws_inc = wb[inc_name]
    ws_bs = wb[bs_name]

    # Find periods from row 2
    cols: list[tuple[int, str]] = []
    for c in range(2, ws_inc.max_column + 1):
        v = ws_inc.cell(2, c).value
        if v:
            cols.append((c, str(v).strip()))

    if not cols:
        if "data sheet" in lower_sheets:
            return _extract_from_data_sheet(wb[lower_sheets["data sheet"]])
        return company_name, [], []

    # Map rows
    inc_rows: dict[str, dict[int, float]] = {}
    for r in range(1, ws_inc.max_row + 1):
        lbl = str(ws_inc.cell(r, 1).value or "").strip().lower()
        if lbl:
            inc_rows[lbl] = {c: _to_float(ws_inc.cell(r, c).value) for c, _ in cols}

    bs_rows: dict[str, float | None] = {}
    for r in range(1, ws_bs.max_row + 1):
        lbl = str(ws_bs.cell(r, 1).value or "").strip().lower()
        raw_value = ws_bs.cell(r, 2).value
        val = _to_float(raw_value) if raw_value is not None else None
        if lbl:
            bs_rows[lbl] = val

    cash = bs_rows.get("cash and cash equivalents")
    ar = bs_rows.get("accounts receivable")
    inv = bs_rows.get("merchandise inventory")
    cur_assets = bs_rows.get("total current assets")
    tot_assets = bs_rows.get("total assets", bs_rows.get("total corporate assets"))
    cur_liab = bs_rows.get("total current liabilities", bs_rows.get("current liabilities"))
    tot_liab = bs_rows.get("total liabilities")
    tot_eq = bs_rows.get("total equity")

    records: list[dict[str, Any]] = []
    cashflows: list[dict[str, Any]] = []

    for c, period in cols:
        rev = None
        for k, vmap in inc_rows.items():
            if any(term in k for term in ["revenue", "sales", "gross revenue"]):
                rev = vmap.get(c)
                break

        cogs = None
        for k, vmap in inc_rows.items():
            if "cogs" in k or "cost of goods" in k:
                cogs = vmap.get(c)
                break

        opex = None
        for k, vmap in inc_rows.items():
            if "operating expenses" in k:
                opex = vmap.get(c)
                break

        net_inc = None
        for k, vmap in inc_rows.items():
            if any(term in k for term in ("net profit", "net income", "profit after tax", "pat")):
                net_inc = vmap.get(c)
                break

        records.append({
            "period": period,
            "revenue": rev,
            "cogs": cogs,
            "operating_expenses": opex,
            "net_income": net_inc,
            "total_assets": tot_assets,
            "total_liabilities": tot_liab,
            "total_equity": tot_eq,
            "total_current_assets": cur_assets,
            "total_current_liabilities": cur_liab,
            "cash": cash,
            "closing_cash": cash,
            "accounts_receivable": ar,
            "inventory": inv,
            "short_term_debt": None,
        "long_term_debt": bs_rows.get("borrowings", bs_rows.get("total debt")),
            "interest_expense": None,
            "ebit": None,
            "operating_cash_flow": None,
            "investing_cash_flow": None,
            "financing_cash_flow": None,
            "notes": f"Extracted from 3-statement model for {company_name}",
        })

    return company_name, records, cashflows
