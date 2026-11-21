"""
Financial Statement Engine
---------------------------
Computes standard liquidity, leverage, and profitability ratios from a
business's raw statement figures. All inputs are plain floats so this
engine has zero dependency on the ORM layer or any particular document
format — the RAG/ingestion layer is responsible for getting numbers into
this shape.
"""
from __future__ import annotations

from dataclasses import dataclass


def _safe_div(numerator: float | None, denominator: float | None) -> float | None:
    if numerator is None or denominator is None or denominator == 0:
        return None
    return numerator / denominator


@dataclass
class BalanceSheet:
    cash: float | None = None
    accounts_receivable: float | None = None
    inventory: float | None = None
    other_current_assets: float | None = None
    total_current_assets: float | None = None
    total_assets: float = 0.0
    total_current_liabilities: float | None = None
    total_liabilities: float = 0.0
    total_equity: float = 0.0
    borrowings: float | None = None


@dataclass
class IncomeStatement:
    revenue: float = 0.0
    cogs: float | None = None
    operating_expenses: float = 0.0
    net_income: float = 0.0
    operating_profit: float | None = None


@dataclass
class RatioResult:
    name: str
    value: float | None
    interpretation: str


class FinancialStatementEngine:
    """Computes a standard ratio pack used across the dashboard & AI advisor."""

    def compute(
        self, balance_sheet: BalanceSheet, income_statement: IncomeStatement
    ) -> list[RatioResult]:
        bs, inc = balance_sheet, income_statement
        results: list[RatioResult] = []

        def add(name: str, value: float | None, good_if: str):
            results.append(RatioResult(name=name, value=_round(value), interpretation=good_if))

        # Liquidity: require reported current assets and liabilities; never substitute cash or other liabilities
        has_liquidity = (
            bs.total_current_assets is not None
            and bs.total_current_liabilities is not None
            and bs.total_current_liabilities > 0
        )
        add(
            "current_ratio",
            _safe_div(bs.total_current_assets, bs.total_current_liabilities) if has_liquidity else None,
            "higher is more liquid; below 1.0 signals short-term cash risk",
        )
        inv = bs.inventory or 0.0
        add(
            "quick_ratio",
            _safe_div(bs.total_current_assets - inv, bs.total_current_liabilities) if has_liquidity and bs.inventory is not None else None,
            "higher is better; excludes inventory from liquid assets",
        )

        # Leverage: explicitly distinguish borrowings (debt) from total liabilities
        borrowings_val = bs.borrowings if bs.borrowings is not None else None
        add(
            "borrowings_to_equity",
            _safe_div(borrowings_val, bs.total_equity) if borrowings_val is not None else None,
            "interest-bearing borrowings divided by shareholders' equity",
        )
        add(
            "total_liabilities_to_equity",
            _safe_div(bs.total_liabilities, bs.total_equity),
            "total liabilities divided by shareholders' equity",
        )
        add(
            "borrowings_to_assets",
            _pct(_safe_div(borrowings_val, bs.total_assets)) if borrowings_val is not None else None,
            "share of assets financed by reported borrowings (percentage)",
        )
        add(
            "total_liabilities_to_assets",
            _pct(_safe_div(bs.total_liabilities, bs.total_assets)),
            "total liabilities divided by total assets (percentage)",
        )
        # Aliases for backwards compatibility
        add(
            "debt_to_equity",
            _safe_div(borrowings_val, bs.total_equity) if borrowings_val is not None else None,
            "reported borrowings divided by shareholders' equity",
        )
        add(
            "debt_to_assets",
            _pct(_safe_div(borrowings_val, bs.total_assets)) if borrowings_val is not None else None,
            "reported borrowings divided by total assets (percentage)",
        )

        # Margins & profitability: only calculate if required inputs are present
        gross_profit = (inc.revenue - inc.cogs) if (inc.cogs is not None and inc.revenue > 0) else None
        add(
            "gross_margin_pct",
            _pct(_safe_div(gross_profit, inc.revenue)) if gross_profit is not None else None,
            "higher means more revenue retained after direct costs",
        )
        add(
            "net_margin_pct",
            _pct(_safe_div(inc.net_income, inc.revenue)) if inc.revenue > 0 else None,
            "higher means more revenue converts to bottom-line profit",
        )
        op_profit = (
            inc.operating_profit
            if inc.operating_profit is not None
            else (gross_profit - inc.operating_expenses if gross_profit is not None else None)
        )
        add(
            "operating_margin_pct",
            _pct(_safe_div(op_profit, inc.revenue)) if op_profit is not None else None,
            "profitability from core operations before financing effects",
        )
        add(
            "return_on_assets_pct",
            _pct(_safe_div(inc.net_income, bs.total_assets)) if bs.total_assets > 0 else None,
            "how efficiently assets generate profit",
        )
        add(
            "return_on_equity_pct",
            _pct(_safe_div(inc.net_income, bs.total_equity)) if bs.total_equity != 0 else None,
            "return generated on owners' invested capital",
        )
        wc = (
            bs.total_current_assets - bs.total_current_liabilities
            if (bs.total_current_assets is not None and bs.total_current_liabilities is not None)
            else None
        )
        add(
            "working_capital",
            _round(wc),
            "positive working capital means short-term obligations are covered",
        )
        return results


def _round(value: float | None) -> float | None:
    return None if value is None else round(value, 4)


def _pct(value: float | None) -> float | None:
    return None if value is None else round(value * 100.0, 2)
