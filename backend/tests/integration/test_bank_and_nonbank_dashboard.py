import io
import datetime
import openpyxl
import pytest
from app.services.financial_extractor import extract_financial_records_from_workbook
from app.engines.financial_statement import BalanceSheet, FinancialStatementEngine, IncomeStatement
from app.rag.vectorstore import InMemoryVectorStore
from app.rag.retriever import Retriever
from app.rag.agentic_rag import AgenticRAGEngine
from app.rag.ingestion import chunk_document
from app.services.document_extraction import extract_text


def _screener_workbook(
    company: str,
    *,
    revenue: float = 100_000,
    net_profit: float = 10_000,
    assets: float = 100_000,
    liabilities: float = 70_000,
    equity: float = 30_000,
    borrowings: float = 50_000,
    cash: float = 5_000,
    cfo: float | None = None,
    cfi: float | None = None,
    cff: float | None = None,
    net_cash_flow: float | None = None,
    operating_profit: float | None = None,
) -> bytes:
    """Create a small public-data-free Screener-style workbook fixture."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Data Sheet"
    wb.create_sheet("Profit & Loss")
    wb.create_sheet("Balance Sheet")
    wb.create_sheet("Cash Flow")
    wb.create_sheet("Quarters")
    ws.cell(1, 1, "COMPANY NAME")
    ws.cell(1, 2, company)

    ws.cell(15, 1, "PROFIT & LOSS")
    ws.cell(16, 1, "Report Date")
    years = list(range(2017, 2027))
    for col, year in enumerate(years, start=2):
        ws.cell(16, col, datetime.datetime(year, 3, 31))

    def add_row(row: int, label: str, value: float | None) -> None:
        ws.cell(row, 1, label)
        if value is not None:
            for col in range(2, len(years) + 2):
                ws.cell(row, col, value)

    add_row(17, "Sales", revenue)
    add_row(18, "Net profit", net_profit)
    add_row(19, "Operating Profit", operating_profit)

    ws.cell(56, 1, "BALANCE SHEET")
    add_row(57, "Equity share capital", equity * 0.1)
    add_row(58, "Reserves", equity * 0.9)
    add_row(59, "Borrowings", borrowings)
    add_row(60, "Other liabilities", liabilities - borrowings)
    add_row(66, "Total assets", assets)
    add_row(67, "Receivables", 1_000)
    add_row(68, "Inventory", 500)
    add_row(69, "Cash & Bank", cash)

    ws.cell(80, 1, "CASH FLOW")
    add_row(82, "Cash from operating activity", cfo)
    add_row(83, "Cash from investing activity", cfi)
    add_row(84, "Cash from financing activity", cff)
    add_row(85, "Net cash flow", net_cash_flow)

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def test_hdfc_bank_financial_extraction_and_ratios():
    raw = _screener_workbook(
        "HDFC Bank Ltd", revenue=348615.15, net_profit=76025.97,
        assets=4907701.34, liabilities=4321641.87, equity=586059.47,
        borrowings=3688122.84, cash=200707.11, cfo=113506.38,
        cfi=7476.62, cff=-59004.85, net_cash_flow=61978.15,
    )

    company_name, records, cashflows = extract_financial_records_from_workbook(raw, "HDFC Bank.xlsx")
    assert "HDFC" in company_name.upper()
    assert len(records) >= 5

    # Check latest period (FY26 / 2026-03-31)
    fy26 = records[-1]
    assert fy26["period"] == "2026-03-31"

    # Verify source reported figures
    sales = fy26["revenue"]
    net_profit = fy26["net_income"]
    total_assets = fy26["total_assets"]
    total_liab = fy26["total_liabilities"]
    total_equity = fy26["total_equity"]
    borrowings = (fy26.get("short_term_debt") or 0.0) + (fy26.get("long_term_debt") or 0.0)

    assert round(sales, 2) == 348615.15
    assert round(net_profit, 2) == 76025.97
    assert round(total_assets, 2) == 4907701.34
    assert round(total_liab, 2) == 4321641.87
    assert round(total_equity, 2) == 586059.47
    assert round(borrowings, 2) == 3688122.84

    # Accounting check: Assets = Liabilities + Equity
    assert abs(total_assets - (total_liab + total_equity)) < 0.1

    # For banks, current assets and current liabilities are not reported in the filing; never substitute cash or other liabilities
    assert fy26["total_current_assets"] is None
    assert fy26["total_current_liabilities"] is None

    # Compute deterministic ratios
    bs = BalanceSheet(
        cash=fy26["cash"],
        accounts_receivable=fy26["accounts_receivable"],
        inventory=fy26["inventory"],
        total_current_assets=fy26["total_current_assets"],
        total_assets=total_assets,
        total_current_liabilities=fy26["total_current_liabilities"],
        total_liabilities=total_liab,
        total_equity=total_equity,
        borrowings=borrowings,
    )
    inc = IncomeStatement(
        revenue=sales,
        cogs=fy26["cogs"],
        operating_expenses=fy26["operating_expenses"],
        net_income=net_profit,
        operating_profit=fy26.get("ebit"),
    )
    engine = FinancialStatementEngine()
    ratios = {r.name: r.value for r in engine.compute(bs, inc)}

    # Acceptance ratios for HDFC Bank FY26:
    # Borrowings / equity ≈ 6.29x
    # Total liabilities / equity ≈ 7.37x
    # Borrowings / assets ≈ 75.1%
    # Total liabilities / assets ≈ 88.1%
    assert abs(ratios["borrowings_to_equity"] - 6.29) < 0.02
    assert abs(ratios["total_liabilities_to_equity"] - 7.37) < 0.02
    assert abs(ratios["borrowings_to_assets"] - 75.1) < 0.2
    assert abs(ratios["total_liabilities_to_assets"] - 88.1) < 0.2

    # Liquidity must be None (N/A)
    assert ratios["current_ratio"] is None
    assert ratios["quick_ratio"] is None
    assert ratios["working_capital"] is None

    # Cash flows: Distinct operating cash flow, net cash flow, and closing cash
    assert fy26["operating_cash_flow"] == 113506.38
    assert fy26["investing_cash_flow"] == 7476.62
    assert fy26["financing_cash_flow"] == -59004.85
    assert fy26["net_cash_flow"] == pytest.approx(61978.15)
    assert fy26["closing_cash"] == 200707.11


def test_sbi_financial_extraction_and_ratios():
    raw = _screener_workbook(
        "State Bank of India", assets=8321175.98, liabilities=7725045.11,
        equity=596130.87, borrowings=6820399.27,
    )

    company_name, records, cashflows = extract_financial_records_from_workbook(raw, "SBI.xlsx")
    assert "STATE BANK" in company_name.upper() or "SBI" in company_name.upper()

    fy26 = records[-1]
    assert fy26["period"] == "2026-03-31"

    borrowings = (fy26.get("short_term_debt") or 0.0) + (fy26.get("long_term_debt") or 0.0)
    assert round(borrowings, 2) == 6820399.27
    assert round(fy26["total_assets"], 2) == 8321175.98
    assert round(fy26["total_liabilities"], 2) == 7725045.11
    assert round(fy26["total_equity"], 2) == 596130.87

    bs = BalanceSheet(
        cash=fy26["cash"],
        total_current_assets=fy26["total_current_assets"],
        total_assets=fy26["total_assets"],
        total_current_liabilities=fy26["total_current_liabilities"],
        total_liabilities=fy26["total_liabilities"],
        total_equity=fy26["total_equity"],
        borrowings=borrowings,
    )
    inc = IncomeStatement(
        revenue=fy26["revenue"],
        cogs=fy26["cogs"],
        operating_expenses=fy26["operating_expenses"],
        net_income=fy26["net_income"],
    )
    ratios = {r.name: r.value for r in FinancialStatementEngine().compute(bs, inc)}

    # SBI ratios: Distinct borrowings vs liabilities
    assert ratios["borrowings_to_equity"] > 11.0
    assert ratios["total_liabilities_to_equity"] > 12.0
    assert ratios["borrowings_to_assets"] > 80.0
    assert ratios["total_liabilities_to_assets"] > 90.0
    assert ratios["current_ratio"] is None


def test_nonbank_adani_power_missing_liquidity_and_margins_stay_unavailable():
    raw = _screener_workbook("Adani Power Ltd")

    company_name, records, cashflows = extract_financial_records_from_workbook(raw, "Adani Power.xlsx")
    assert "ADANI POWER" in company_name.upper()
    latest = records[-1]

    # Missing explicit totals must remain unavailable even if some components
    # or broad "other" rows exist in the filing.
    assert latest["total_current_assets"] is None
    assert latest["total_current_liabilities"] is None

    bs = BalanceSheet(
        cash=latest["cash"],
        accounts_receivable=latest["accounts_receivable"],
        inventory=latest["inventory"],
        total_current_assets=latest["total_current_assets"],
        total_assets=latest["total_assets"],
        total_current_liabilities=latest["total_current_liabilities"],
        total_liabilities=latest["total_liabilities"],
        total_equity=latest["total_equity"],
        borrowings=(latest.get("short_term_debt") or 0.0) + (latest.get("long_term_debt") or 0.0),
    )
    inc = IncomeStatement(
        revenue=latest["revenue"],
        cogs=latest["cogs"],
        operating_expenses=latest["operating_expenses"],
        net_income=latest["net_income"],
    )
    ratios = {r.name: r.value for r in FinancialStatementEngine().compute(bs, inc)}

    assert ratios["current_ratio"] is None
    assert ratios["quick_ratio"] is None
    assert ratios["working_capital"] is None
    assert ratios["gross_margin_pct"] is None
    assert ratios["operating_margin_pct"] is None


def test_rag_gtl_infra_annual_profit_inquiry():
    raw = _screener_workbook("GTL Infrastructure Ltd", net_profit=779.26)
    text = extract_text("GTL Infra.xlsx", raw)
    chunks = chunk_document(text, source="GTL Infra.xlsx", metadata={"org_id": "org_gtl"})
    store = InMemoryVectorStore()
    store.upsert(chunks)
    retriever = Retriever(store, metadata_filter={"org_id": "org_gtl"})
    rag = AgenticRAGEngine(retriever)

    result = rag.retrieve_and_reason("what is annual profit")
    assert "GTL INFRASTRUCTURE" in result.reasoned_decision.upper()
    assert "Annual Profit & Loss Trajectory" in result.reasoned_decision
    assert "779.26" in result.reasoned_decision or "PAT" in result.reasoned_decision
    assert "No structured financial figures were auto-extracted" not in result.reasoned_decision


def test_three_statement_parser_does_not_fill_missing_financials_with_demo_values():
    import io
    import openpyxl

    wb = openpyxl.Workbook()
    inc = wb.active
    inc.title = "Income_Statement"
    inc.append(["Metric", "FY25"])
    inc.append(["Revenue", 1000])
    inc.append(["Operating Expenses", 400])
    bs = wb.create_sheet("Balance_Sheet")
    bs.append(["Metric", "Value"])
    bs.append(["Cash and Cash Equivalents", 75])
    buf = io.BytesIO()
    wb.save(buf)

    _, records, _ = extract_financial_records_from_workbook(buf.getvalue(), "MinimalCo.xlsx")
    latest = records[-1]

    assert latest["revenue"] == 1000
    assert latest["net_income"] is None
    assert latest["total_assets"] is None
    assert latest["total_liabilities"] is None
    assert latest["total_equity"] is None
    assert latest["total_current_assets"] is None
    assert latest["total_current_liabilities"] is None
    assert latest["long_term_debt"] is None
