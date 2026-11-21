from __future__ import annotations

import io
import json
import re
import uuid
from datetime import datetime, timezone
from xml.sax.saxutils import escape

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import TokenPayload, get_current_user
from app.db.models import Business, Document, FinancialRecord
from app.db.session import get_session
from app.engines.financial_statement import BalanceSheet, FinancialStatementEngine, IncomeStatement
from app.engines.risk_detection import RiskDetectionEngine, RiskInputs
from app.models.schemas import ReportRequest

router = APIRouter(prefix="/reports", tags=["reports"])

_INK = colors.HexColor("#1D3028")
_GREEN = colors.HexColor("#176B4D")
_MUTED = colors.HexColor("#65746D")
_BORDER = colors.HexColor("#DCE4DE")
_PALE = colors.HexColor("#F2F6F3")


def _source_refs(record: FinancialRecord) -> dict[str, str]:
    notes = record.notes or ""
    if "source_refs=" not in notes:
        return {}
    try:
        raw = json.loads(notes.split("source_refs=", 1)[1])
        return raw if isinstance(raw, dict) else {}
    except (json.JSONDecodeError, TypeError):
        return {}


def _available_value(record: FinancialRecord, field: str) -> float | None:
    value = getattr(record, field, None)
    if value is None:
        return None
    refs = _source_refs(record)
    ref_field = {"ebit": "operating_profit", "short_term_debt": "borrowings", "long_term_debt": "borrowings"}.get(field, field)
    reference = refs.get(ref_field, "")
    if value == 0 and refs and field in {"operating_expenses", "accounts_receivable", "other_current_assets"} and ref_field not in refs:
        return None
    if value == 0 and reference.startswith("not reported"):
        return None
    return float(value)


def _money(value: float | None, currency: str) -> str:
    if value is None:
        return "Not reported"
    return f"{currency} {value:,.2f}"


def _percent_change(current: float | None, previous: float | None) -> str:
    if current is None or previous is None:
        return "Not available"
    if previous == 0:
        return "Not meaningful (prior period was zero)"
    change = (current - previous) / abs(previous) * 100
    return f"{change:+,.1f}%"


def _safe_text(value: object) -> str:
    return escape(str(value)).replace("\n", "<br/>")


def _ratio_label(name: str) -> str:
    labels = {
        "current_ratio": "Current ratio (x)",
        "quick_ratio": "Quick ratio (x)",
        "borrowings_to_equity": "Borrowings to equity (x)",
        "debt_to_equity": "Debt to equity (x)",
        "total_liabilities_to_equity": "Total liabilities to equity (x)",
        "borrowings_to_assets": "Borrowings to assets (%)",
        "debt_to_assets": "Debt to assets (%)",
        "total_liabilities_to_assets": "Liabilities to assets (%)",
        "gross_margin_pct": "Gross margin (%)",
        "net_margin_pct": "Net margin (%)",
        "operating_margin_pct": "Operating margin (%)",
        "return_on_assets_pct": "Return on assets (%)",
        "return_on_equity_pct": "Return on equity (%)",
        "working_capital": "Working capital",
    }
    return labels.get(name, name.replace("_", " ").title())


def _ratio_explanation(name: str) -> tuple[str, str]:
    details = {
        "current_ratio": ("Current assets ÷ current liabilities", "Compares short-term assets with obligations due soon. Below 1 means reported current assets are lower than current liabilities."),
        "quick_ratio": ("(Current assets − inventory) ÷ current liabilities", "Similar to current ratio, but removes inventory because it may take longer to turn into cash."),
        "borrowings_to_equity": ("Interest-bearing borrowings ÷ equity", "Shows reported borrowings relative to shareholders’ equity. Higher values indicate more borrowing in the capital mix."),
        "total_liabilities_to_equity": ("Total liabilities ÷ equity", "Compares all reported liabilities, including non-borrowing obligations, with shareholders’ equity."),
        "borrowings_to_assets": ("Interest-bearing borrowings ÷ total assets", "Shows the share of reported assets financed by borrowings."),
        "total_liabilities_to_assets": ("Total liabilities ÷ total assets", "Shows the share of reported assets matched by liabilities."),
        "gross_margin_pct": ("(Revenue − cost of goods sold) ÷ revenue", "Share of revenue remaining after direct costs, before operating expenses and financing costs."),
        "net_margin_pct": ("Net income ÷ revenue", "Share of revenue left as net profit or loss after recorded expenses."),
        "operating_margin_pct": ("Operating profit ÷ revenue", "Share of revenue generated as operating profit before financing and tax effects."),
        "return_on_assets_pct": ("Net income ÷ total assets", "Relates reported profit to the asset base. Interpret across comparable periods and businesses."),
        "return_on_equity_pct": ("Net income ÷ equity", "Relates reported profit to shareholders’ equity; can be distorted when equity is very small or negative."),
        "working_capital": ("Current assets − current liabilities", "Absolute short-term asset buffer after current liabilities, in the report currency."),
    }
    return details.get(name, ("See calculation engine definition", "Interpret with the underlying statements and company context."))


def _build_observations(selected: FinancialRecord, previous: FinancialRecord | None, ratios: list, currency: str) -> list[list[str]]:
    by_name = {ratio.name: ratio.value for ratio in ratios}
    observations: list[list[str]] = []
    revenue = _available_value(selected, "revenue")
    net_income = _available_value(selected, "net_income")
    if revenue is not None and net_income is not None:
        margin = by_name.get("net_margin_pct")
        outcome = "reported a net profit" if net_income > 0 else "reported a net loss" if net_income < 0 else "reported break-even net income"
        detail = f"Net income was {_money(net_income, currency)}"
        if margin is not None:
            detail += f" ({margin:.2f}% of revenue)"
        observations.append(["Profitability", f"Revenue was {_money(revenue, currency)} and the company {outcome}. {detail}."])
    else:
        observations.append(["Profitability", "A complete revenue and net-income pair was not available; profitability could not be summarized."])

    current_ratio = by_name.get("current_ratio")
    if current_ratio is None:
        observations.append(["Short-term liquidity", "Not assessed: both reported current assets and current liabilities are required."])
    else:
        observations.append(["Short-term liquidity", f"Current ratio was {current_ratio:.2f}x. This compares reported current assets with current liabilities; timing and asset convertibility also matter."])

    debt_equity = by_name.get("borrowings_to_equity")
    if debt_equity is None:
        observations.append(["Borrowing leverage", "Not assessed: reported borrowings and non-zero shareholders’ equity are required."])
    else:
        observations.append(["Borrowing leverage", f"Borrowings were {debt_equity:.2f}x shareholders’ equity. This covers interest-bearing borrowings only, not all liabilities."])

    assets = _available_value(selected, "total_assets")
    liabilities = _available_value(selected, "total_liabilities")
    equity = _available_value(selected, "total_equity")
    if assets is not None and liabilities is not None and equity is not None:
        difference = assets - liabilities - equity
        pct = abs(difference) / abs(assets) * 100 if assets else None
        observations.append(["Balance-sheet cross-check", f"Assets less liabilities and equity = {_money(difference, currency)}" + (f" ({pct:.2f}% of assets)." if pct is not None else ".") + " A difference may indicate extraction, classification, rounding, or reporting-basis issues and should be reconciled to the source statement."])
    else:
        observations.append(["Balance-sheet cross-check", "Not calculated because total assets, total liabilities, and equity were not all reported."])

    if previous is not None:
        change = _percent_change(revenue, _available_value(previous, "revenue"))
        if change not in {"Not available", "Not meaningful (prior period was zero)"}:
            direction = "increased" if not change.startswith("-") else "decreased"
            observations.append(["Revenue movement", f"Revenue {direction} {change.lstrip('+')} versus the preceding saved period ({previous.period}). The periods may cover different lengths."])
    return observations


def _report_data(records: list[FinancialRecord], selected: FinancialRecord) -> tuple[list, list, object | None, int | None]:
    total_assets = _available_value(selected, "total_assets")
    total_liabilities = _available_value(selected, "total_liabilities")
    total_equity = _available_value(selected, "total_equity")
    bs = BalanceSheet(
        cash=_available_value(selected, "closing_cash") if _available_value(selected, "closing_cash") is not None else _available_value(selected, "cash"),
        accounts_receivable=_available_value(selected, "accounts_receivable"),
        inventory=_available_value(selected, "inventory"),
        other_current_assets=_available_value(selected, "other_current_assets"),
        total_current_assets=_available_value(selected, "total_current_assets"),
        total_assets=total_assets or 0.0,
        total_current_liabilities=_available_value(selected, "total_current_liabilities"),
        total_liabilities=total_liabilities or 0.0,
        total_equity=total_equity or 0.0,
        borrowings=(
            (_available_value(selected, "short_term_debt") or 0.0)
            + (_available_value(selected, "long_term_debt") or 0.0)
            if _available_value(selected, "short_term_debt") is not None or _available_value(selected, "long_term_debt") is not None
            else None
        ),
    )
    revenue = _available_value(selected, "revenue") or 0.0
    cogs = _available_value(selected, "cogs")
    inc = IncomeStatement(
        revenue=revenue,
        cogs=cogs if cogs is not None and cogs > 0 else None,
        operating_expenses=_available_value(selected, "operating_expenses") or 0.0,
        net_income=_available_value(selected, "net_income") or 0.0,
        operating_profit=_available_value(selected, "ebit"),
    )
    ratios = FinancialStatementEngine().compute(bs, inc)
    available_borrowings = bs.borrowings is not None
    revenue = _available_value(selected, "revenue")
    net_income = _available_value(selected, "net_income")
    cogs = _available_value(selected, "cogs")
    operating_expenses = _available_value(selected, "operating_expenses")
    ebit = _available_value(selected, "ebit")
    for ratio in ratios:
        if ratio.name in {"current_ratio", "quick_ratio", "working_capital"} and (
            bs.total_current_assets is None or bs.total_current_liabilities is None
        ):
            ratio.value = None
        elif ratio.name == "quick_ratio" and bs.inventory is None:
            ratio.value = None
        elif ratio.name in {"borrowings_to_equity", "debt_to_equity"} and (not available_borrowings or total_equity in (None, 0)):
            ratio.value = None
        elif ratio.name == "borrowings_to_assets" and (not available_borrowings or total_assets in (None, 0)):
            ratio.value = None
        elif ratio.name == "debt_to_assets" and (not available_borrowings or total_assets in (None, 0)):
            ratio.value = None
        elif ratio.name == "total_liabilities_to_equity" and (total_liabilities is None or total_equity in (None, 0)):
            ratio.value = None
        elif ratio.name == "total_liabilities_to_assets" and (total_liabilities is None or total_assets in (None, 0)):
            ratio.value = None
        elif ratio.name == "gross_margin_pct" and (revenue in (None, 0) or cogs is None):
            ratio.value = None
        elif ratio.name == "net_margin_pct" and (revenue in (None, 0) or net_income is None):
            ratio.value = None
        elif ratio.name == "operating_margin_pct" and (
            revenue in (None, 0) or (ebit is None and (cogs in (None, 0) or operating_expenses is None))
        ):
            ratio.value = None
        elif ratio.name == "return_on_assets_pct" and (net_income is None or total_assets in (None, 0)):
            ratio.value = None
        elif ratio.name == "return_on_equity_pct" and (net_income is None or total_equity in (None, 0)):
            ratio.value = None
    ratio_values = {item.name: item.value for item in ratios}
    risk_inputs = RiskInputs(
        current_ratio=ratio_values.get("current_ratio"),
        debt_to_equity=ratio_values.get("debt_to_equity"),
        net_margin_pct=ratio_values.get("net_margin_pct"),
    )
    used_risk_inputs = sum(value is not None for value in (
        risk_inputs.current_ratio,
        risk_inputs.debt_to_equity,
        risk_inputs.net_margin_pct,
    ))
    risk = RiskDetectionEngine().evaluate(risk_inputs) if used_risk_inputs else None
    selected_index = next((index for index, record in enumerate(records) if record.id == selected.id), -1)
    previous = records[selected_index - 1] if selected_index > 0 else None
    return ratios, [
        ("Revenue", _available_value(selected, "revenue")),
        ("Cost of goods sold", _available_value(selected, "cogs")),
        ("Operating expenses", _available_value(selected, "operating_expenses")),
        ("Operating profit / EBIT", _available_value(selected, "ebit")),
        ("Net income", _available_value(selected, "net_income")),
        ("Total assets", _available_value(selected, "total_assets")),
        ("Current assets", _available_value(selected, "total_current_assets")),
        ("Cash / closing cash", _available_value(selected, "closing_cash") if _available_value(selected, "closing_cash") is not None else _available_value(selected, "cash")),
        ("Accounts receivable", _available_value(selected, "accounts_receivable")),
        ("Inventory", _available_value(selected, "inventory")),
        ("Total liabilities", _available_value(selected, "total_liabilities")),
        ("Current liabilities", _available_value(selected, "total_current_liabilities")),
        ("Short-term debt", _available_value(selected, "short_term_debt")),
        ("Long-term debt", _available_value(selected, "long_term_debt")),
        ("Shareholders' equity", _available_value(selected, "total_equity")),
        ("Operating cash flow", _available_value(selected, "operating_cash_flow")),
        ("Investing cash flow", _available_value(selected, "investing_cash_flow")),
        ("Financing cash flow", _available_value(selected, "financing_cash_flow")),
        ("Net cash flow", _available_value(selected, "net_cash_flow")),
    ], risk, previous


def _table(rows: list[list[str]], widths: list[float], *, small: bool = False) -> Table:
    style_name = "ReportTableSmall" if small else "ReportTable"
    body_size = 7.5 if small else 8.5
    cell_style = ParagraphStyle(style_name, fontName="Helvetica", fontSize=body_size, leading=body_size + 2, textColor=_INK)
    header_style = ParagraphStyle(f"{style_name}Header", fontName="Helvetica-Bold", fontSize=body_size, leading=body_size + 2, textColor=colors.white)
    converted = [[Paragraph(_safe_text(cell), header_style if row_index == 0 else cell_style) for cell in row] for row_index, row in enumerate(rows)]
    table = Table(converted, colWidths=widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), _GREEN),
        ("BACKGROUND", (0, 1), (-1, -1), colors.white),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, _PALE]),
        ("GRID", (0, 0), (-1, -1), 0.35, _BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def _render_pdf(
    business_name: str,
    currency: str,
    records: list[FinancialRecord],
    selected: FinancialRecord,
    document_name: str | None,
    notes: str,
) -> bytes:
    ratios, statements, risk, previous = _report_data(records, selected)
    generated_at = datetime.now(timezone.utc)
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.62 * inch,
        leftMargin=0.62 * inch,
        topMargin=0.78 * inch,
        bottomMargin=0.68 * inch,
        title=f"{business_name} | Financial Management Report | {selected.period}",
        author="FinSight AI",
    )
    sample = getSampleStyleSheet()
    styles = {
        "title": ParagraphStyle("ReportTitle", parent=sample["Title"], fontName="Helvetica-Bold", fontSize=22, leading=26, alignment=TA_LEFT, textColor=_INK, spaceAfter=5),
        "subtitle": ParagraphStyle("ReportSubtitle", parent=sample["Normal"], fontName="Helvetica", fontSize=10, leading=14, textColor=_MUTED, spaceAfter=6),
        "section": ParagraphStyle("ReportSection", parent=sample["Heading2"], fontName="Helvetica-Bold", fontSize=12, leading=15, textColor=_GREEN, spaceBefore=10, spaceAfter=6, keepWithNext=True),
        "body": ParagraphStyle("ReportBody", parent=sample["BodyText"], fontName="Helvetica", fontSize=9, leading=13, textColor=_INK, spaceAfter=5),
        "small": ParagraphStyle("ReportSmall", parent=sample["BodyText"], fontName="Helvetica", fontSize=7.8, leading=10.5, textColor=_MUTED, spaceAfter=3),
        "metric": ParagraphStyle("ReportMetric", parent=sample["BodyText"], fontName="Helvetica-Bold", fontSize=11, leading=14, textColor=_INK),
        "metric_label": ParagraphStyle("ReportMetricLabel", parent=sample["BodyText"], fontName="Helvetica", fontSize=7.5, leading=10, textColor=_MUTED),
    }

    def draw_page(canvas, report_doc):
        canvas.saveState()
        page_width, page_height = letter
        mark_x = doc.leftMargin
        mark_y = page_height - 0.47 * inch
        canvas.setFillColor(_GREEN)
        canvas.roundRect(mark_x, mark_y - 8, 22, 22, 5, fill=1, stroke=0)
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 12)
        canvas.drawCentredString(mark_x + 11, mark_y - 1, "F")
        canvas.setFillColor(_GREEN)
        canvas.setFont("Helvetica-Bold", 8.5)
        canvas.drawString(mark_x + 29, page_height - 0.39 * inch, "FINSIGHT")
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(_MUTED)
        canvas.drawString(mark_x + 77, page_height - 0.39 * inch, "FINANCIAL MANAGEMENT REPORT")
        canvas.setStrokeColor(_BORDER)
        canvas.setLineWidth(0.6)
        canvas.line(doc.leftMargin, page_height - 0.53 * inch, page_width - doc.rightMargin, page_height - 0.53 * inch)
        canvas.setStrokeColor(_BORDER)
        canvas.line(doc.leftMargin, 0.49 * inch, page_width - doc.rightMargin, 0.49 * inch)
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(_MUTED)
        canvas.drawString(doc.leftMargin, 0.34 * inch, f"{business_name} · {selected.period} · Generated {generated_at:%Y-%m-%d %H:%M} UTC")
        canvas.drawRightString(page_width - doc.rightMargin, 0.34 * inch, f"Page {report_doc.page}")
        canvas.restoreState()

    story = [
        Paragraph(_safe_text(business_name), styles["title"]),
        Paragraph(f"FINANCIAL MANAGEMENT REPORT  ·  PERIOD {_safe_text(selected.period)}", styles["subtitle"]),
        HRFlowable(width="100%", thickness=1.2, color=_GREEN, spaceBefore=2, spaceAfter=10),
    ]
    source_text = f"Source: {_safe_text(document_name or selected.source or 'workspace financial record')} · Record marked verified in workspace: {'Yes' if selected.verified else 'No'}"
    story.append(Paragraph(source_text, styles["small"]))
    story.append(Paragraph("Executive summary", styles["section"]))

    summary_sentences = [f"This report summarizes the financial record saved for {_safe_text(selected.period)}."]
    if previous is not None:
        summary_sentences.append(f"Period comparison is against the preceding saved period, {_safe_text(previous.period)}; periods may have different lengths.")
        revenue_change = _percent_change(_available_value(selected, "revenue"), _available_value(previous, "revenue"))
        profit_change = _percent_change(_available_value(selected, "net_income"), _available_value(previous, "net_income"))
        if revenue_change != "Not available":
            summary_sentences.append(f"Revenue changed {revenue_change}; net income changed {profit_change}.")
    else:
        summary_sentences.append("Only one saved period is available, so no period-over-period change is calculated.")
    summary_sentences.append("The analysis below distinguishes reported figures from calculated ratios; missing items are labeled rather than estimated.")
    story.append(Paragraph(" ".join(summary_sentences), styles["body"]))

    story.append(Paragraph("How to read this report", styles["section"]))
    story.append(Paragraph(
        "Reported figures are taken from the selected saved record. Ratios and cross-checks are calculations from those figures, not separately reported facts. “Not reported” means the workspace has no usable value for that item. Workspace verification is an application status and does not mean the statements were independently audited. Comparisons use the preceding saved period and are not normalized for period length.",
        styles["body"],
    ))

    key_values = [
        ("Revenue", _available_value(selected, "revenue")),
        ("Net income", _available_value(selected, "net_income")),
        ("Total assets", _available_value(selected, "total_assets")),
        ("Total liabilities", _available_value(selected, "total_liabilities")),
        ("Equity", _available_value(selected, "total_equity")),
        ("Cash / closing cash", _available_value(selected, "closing_cash") if _available_value(selected, "closing_cash") is not None else _available_value(selected, "cash")),
    ]
    metric_cells = []
    for index in range(0, len(key_values), 2):
        pair = key_values[index:index + 2]
        cells = []
        for label, value in pair:
            cells.append([
                Paragraph(_safe_text(label.upper()), styles["metric_label"]),
                Paragraph(_safe_text(_money(value, currency)), styles["metric"]),
            ])
        metric_cells.append([cells[0], cells[1]])
    metric_table = Table(metric_cells, colWidths=[3.63 * inch, 3.63 * inch], hAlign="LEFT")
    metric_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), _PALE),
        ("BOX", (0, 0), (-1, -1), 0.5, _BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, _BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.extend([Spacer(1, 5), metric_table, Paragraph("Key financial position", styles["section"])])

    highlights = []
    for field, label in (("revenue", "Revenue"), ("net_income", "Net income"), ("total_assets", "Total assets"), ("total_liabilities", "Total liabilities"), ("total_equity", "Shareholders' equity")):
        current = _available_value(selected, field)
        if current is None:
            continue
        prior = _available_value(previous, field) if previous is not None else None
        highlights.append([label, _money(current, currency), _money(prior, currency) if previous else "Not available", _percent_change(current, prior) if previous else "Not available"])
    if highlights:
        story.append(_table([["Measure", selected.period, previous.period if previous else "Previous period", "Change"]] + highlights, [1.55 * inch, 1.8 * inch, 1.8 * inch, 1.35 * inch], small=True))
    else:
        story.append(Paragraph("No key statement totals were reported for this period.", styles["body"]))

    story.append(Paragraph("Operating performance", styles["section"]))
    performance_rows = [["Income statement item", "Reported value"]]
    for label, field in (("Revenue", "revenue"), ("Cost of goods sold", "cogs"), ("Operating expenses", "operating_expenses"), ("Operating profit / EBIT", "ebit"), ("Net income", "net_income")):
        performance_rows.append([label, _money(_available_value(selected, field), currency)])
    story.append(_table(performance_rows, [3.8 * inch, 2.7 * inch]))

    story.append(Paragraph("Calculated observations and review points", styles["section"]))
    observation_rows = [["Area", "What the saved figures show"]]
    observation_rows.extend(_build_observations(selected, previous, ratios, currency))
    story.append(_table(observation_rows, [1.55 * inch, 4.95 * inch], small=True))

    story.append(Paragraph("Balance sheet", styles["section"]))
    balance_rows = [["Balance sheet item", "Reported value"]]
    balance_rows.extend([[label, _money(amount, currency)] for label, amount in statements[5:15]])
    story.append(_table(balance_rows, [3.25 * inch, 3.25 * inch], small=True))

    story.append(Paragraph("Cash flow", styles["section"]))
    cash_flow_rows = [["Cash flow item", "Reported value"]]
    cash_flow_rows.extend([[label, _money(amount, currency)] for label, amount in statements[15:19]])
    story.append(_table(cash_flow_rows, [3.25 * inch, 3.25 * inch], small=True))

    story.append(Paragraph("Calculated financial ratios", styles["section"]))
    ratio_rows = [["Measure", "Result", "Formula", "How to understand it"]]
    hidden_aliases = {"debt_to_equity", "debt_to_assets"}
    for ratio in ratios:
        if ratio.name in hidden_aliases:
            continue
        value = ratio.value
        if value is None:
            formatted = "Not available"
        elif ratio.name == "working_capital":
            formatted = _money(value, currency)
        elif ratio.name.endswith("_pct") or ratio.name in {"debt_to_assets", "borrowings_to_assets", "total_liabilities_to_assets"}:
            formatted = f"{value:.2f}%"
        else:
            formatted = f"{value:.2f}x"
        formula, meaning = _ratio_explanation(ratio.name)
        ratio_rows.append([_ratio_label(ratio.name), formatted, formula, meaning])
    story.append(_table(ratio_rows, [1.35 * inch, 0.85 * inch, 1.85 * inch, 2.45 * inch], small=True))
    story.append(Paragraph(
        "Ratios are not universal pass/fail scores. Compare them with the company’s prior periods, business model, accounting policies, and suitable industry peers. Borrowings-to-equity uses reported interest-bearing borrowings; total-liabilities ratios include broader obligations.",
        styles["small"],
    ))

    story.append(Paragraph("Risk review", styles["section"]))
    if risk is None:
        story.append(Paragraph("Risk screening was not scored because the saved record does not contain the required current ratio, borrowings-to-equity, or net-margin inputs.", styles["body"]))
    else:
        story.append(Paragraph(f"Rule-based screening score: {risk.overall_score}/100 · {risk.overall_level.value.upper()}. This is a screening indicator, not a credit rating or assurance opinion.", styles["body"]))
        if risk.flags:
            risk_rows = [["Level", "Indicator", "Observed value"]]
            for flag in risk.flags:
                risk_value = "Not available" if flag.metric_value is None else f"{flag.metric_value:,.2f}"
                risk_rows.append([flag.level.value.upper(), flag.message, risk_value])
            story.append(_table(risk_rows, [0.8 * inch, 4.45 * inch, 1.25 * inch], small=True))
        else:
            story.append(Paragraph("No configured risk flags were raised for the available inputs.", styles["body"]))

    if len(records) > 1:
        story.append(Paragraph("Historical trend", styles["section"]))
        trend = [["Period", "Revenue", "Net income", "Assets", "Liabilities"]]
        prior_records = records[:records.index(selected) + 1] if selected in records else records
        for record in prior_records[-8:]:
            trend.append([
                record.period,
                _money(_available_value(record, "revenue"), currency),
                _money(_available_value(record, "net_income"), currency),
                _money(_available_value(record, "total_assets"), currency),
                _money(_available_value(record, "total_liabilities"), currency),
            ])
        story.append(_table(trend, [0.9 * inch, 1.4 * inch, 1.4 * inch, 1.4 * inch, 1.4 * inch], small=True))

    refs = _source_refs(selected)
    if refs:
        story.append(Paragraph("Source coverage and traceability", styles["section"]))
        source_labels = {
            "revenue": "Revenue", "net_income": "Net income", "total_assets": "Total assets",
            "total_liabilities": "Total liabilities", "total_equity": "Shareholders’ equity",
            "borrowings": "Borrowings", "cash": "Cash", "inventory": "Inventory",
            "total_current_assets": "Current assets", "total_current_liabilities": "Current liabilities",
            "cogs": "Cost of goods sold", "operating_profit": "Operating profit / EBIT",
            "operating_cash_flow": "Operating cash flow", "investing_cash_flow": "Investing cash flow",
            "financing_cash_flow": "Financing cash flow", "net_cash_flow": "Net cash flow",
        }
        source_rows = [["Measure", "Extracted value", "Source reference / availability"]]
        for field, label in source_labels.items():
            if field not in refs:
                continue
            record_field = "ebit" if field == "operating_profit" else field
            if field == "borrowings":
                value_text = _money(
                    (_available_value(selected, "short_term_debt") or 0.0) + (_available_value(selected, "long_term_debt") or 0.0)
                    if _available_value(selected, "short_term_debt") is not None or _available_value(selected, "long_term_debt") is not None
                    else None,
                    currency,
                )
            else:
                value_text = _money(_available_value(selected, record_field), currency)
            source_rows.append([label, value_text, refs[field]])
        story.append(_table(source_rows, [1.45 * inch, 1.55 * inch, 3.5 * inch], small=True))
        period_dates = " to ".join(part for part in (selected.period_start, selected.period_end) if part)
        provenance = f"Uploaded file: {_safe_text(document_name or selected.source or 'Not identified')} · Workspace verified: {'Yes' if selected.verified else 'No'}"
        if period_dates:
            provenance += f" · Statement dates: {_safe_text(period_dates)}"
        story.append(Paragraph(provenance, styles["small"]))

    if notes.strip():
        story.append(Paragraph("Management commentary", styles["section"]))
        story.append(Paragraph(_safe_text(notes.strip()), styles["body"]))

    story.extend([
        Spacer(1, 8),
        HRFlowable(width="100%", thickness=0.5, color=_BORDER, spaceBefore=2, spaceAfter=6),
        Paragraph(
            "Basis and limitations: Values are drawn from the selected workspace record and the adjacent saved periods shown. Comparisons are not adjusted for different period lengths. Ratios are calculated by FinSight's deterministic financial statement engine. Missing inputs are not inferred. This management report is not an audit, assurance opinion, regulator filing, or investment recommendation; validate source statements and accounting treatment before external use.",
            styles["small"],
        ),
    ])
    doc.build(story, onFirstPage=draw_page, onLaterPages=draw_page)
    return buffer.getvalue()


@router.post("/generate")
async def generate_report(
    payload: ReportRequest,
    user: TokenPayload = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> StreamingResponse:
    records = (await session.execute(
        select(FinancialRecord)
        .where(FinancialRecord.business_id == user.business_id)
        .order_by(FinancialRecord.period.asc(), FinancialRecord.created_at.asc())
    )).scalars().all()
    if not records:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Upload financial statement data before generating a report")

    period = payload.period.strip()
    selected = next((record for record in records if record.period == period), None)
    if selected is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Select a reporting period from the uploaded financial records")

    business = (await session.execute(select(Business).where(Business.id == user.business_id))).scalar_one_or_none()
    business_name = business.name if business and business.name not in ("User Workspace", "My Business") else "Business workspace"
    currency = (business.currency if business else "INR") or "INR"
    source_document = None
    if selected.source_document_id:
        source_document = (await session.execute(
            select(Document).where(
                Document.id == selected.source_document_id,
                Document.business_id == user.business_id,
            )
        )).scalar_one_or_none()

    pdf_bytes = _render_pdf(
        business_name=business_name,
        currency=currency,
        records=records,
        selected=selected,
        document_name=source_document.filename if source_document else None,
        notes=payload.notes,
    )
    report_id = str(uuid.uuid4())
    safe_name = re.sub(r"[^A-Za-z0-9_.-]", "_", business_name)[:48] or "business"
    safe_period = re.sub(r"[^A-Za-z0-9_.-]", "_", period)[:40] or "period"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}_{safe_period}_financial_report.pdf"',
            "X-Report-Id": report_id,
        },
    )
