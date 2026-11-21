from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import TokenPayload, get_current_user
from app.db.extensions import CashFlowRecord as CashFlowRow
from app.db.models import Business, FinancialRecord
from app.db.session import get_session
from app.db.util import as_dict
from app.engines.financial_statement import BalanceSheet, FinancialStatementEngine, IncomeStatement
from app.engines.risk_detection import RiskDetectionEngine, RiskInputs
from app.models.schemas_ext import (
    FinancialContextOut,
    FinancialRecordIn,
    FinancialRecordOut,
)
from app.services.financial_context import build_context

router = APIRouter(prefix="/financials", tags=["financial-records"])


def _to_out(row: FinancialRecord) -> FinancialRecordOut:
    return FinancialRecordOut(**as_dict(row))


@router.get("/records", response_model=list[FinancialRecordOut])
async def list_records(
    user: TokenPayload = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[FinancialRecordOut]:
    rows = (await session.execute(
        select(FinancialRecord)
        .where(FinancialRecord.business_id == user.business_id)
        .order_by(FinancialRecord.period.asc())
    )).scalars().all()
    return [_to_out(row) for row in rows]


@router.post("/records", response_model=FinancialRecordOut)
async def upsert_record(
    payload: FinancialRecordIn,
    user: TokenPayload = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> FinancialRecordOut:
    row = (await session.execute(
        select(FinancialRecord).where(
            FinancialRecord.business_id == user.business_id,
            FinancialRecord.period == payload.period,
        )
    )).scalars().first()
    data = payload.model_dump()
    if row is None:
        row = FinancialRecord(business_id=user.business_id, **data)
        session.add(row)
    else:
        for key, value in data.items():
            setattr(row, key, value)
        row.verified = False
    await session.commit()
    await session.refresh(row)
    return _to_out(row)


@router.post("/records/{record_id}/verify", response_model=FinancialRecordOut)
async def verify_record(
    record_id: str,
    user: TokenPayload = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> FinancialRecordOut:
    row = await session.get(FinancialRecord, record_id)
    if row is None or row.business_id != user.business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    row.verified = True
    row.source = "user_verified"
    await session.commit()
    await session.refresh(row)
    return _to_out(row)


@router.delete("/records/{record_id}")
async def delete_record(
    record_id: str,
    user: TokenPayload = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    row = await session.get(FinancialRecord, record_id)
    if row is None or row.business_id != user.business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    await session.delete(row)
    await session.commit()
    return {"deleted": record_id}


@router.get("/context", response_model=FinancialContextOut)
async def financial_context(
    user: TokenPayload = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> FinancialContextOut:
    return await build_context(session, user.business_id)


@router.get("/dashboard")
async def dashboard_summary(
    user: TokenPayload = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    rows = (await session.execute(
        select(FinancialRecord)
        .where(FinancialRecord.business_id == user.business_id)
        .order_by(FinancialRecord.period.asc())
    )).scalars().all()
    if not rows:
        return {"available": False, "message": "No financial records submitted yet.", "periods": []}

    latest = rows[-1]
    latest_borrowings = (
        float((latest.short_term_debt or 0.0) + (latest.long_term_debt or 0.0))
        if (latest.short_term_debt is not None or latest.long_term_debt is not None)
        else None
    )
    cash_series = [float(r.closing_cash if r.closing_cash is not None else r.cash) for r in rows if r.closing_cash is not None or r.cash is not None]
    cash_series_periods = [r.period for r in rows if r.closing_cash is not None or r.cash is not None]

    bs = BalanceSheet(
        cash=float(latest.cash) if latest.cash is not None else None,
        accounts_receivable=float(latest.accounts_receivable) if latest.accounts_receivable is not None else None,
        inventory=float(latest.inventory) if latest.inventory is not None else None,
        other_current_assets=float(latest.other_current_assets) if latest.other_current_assets is not None else None,
        total_current_assets=float(latest.total_current_assets) if latest.total_current_assets is not None else None,
        total_assets=float(latest.total_assets or 0.0),
        total_current_liabilities=float(latest.total_current_liabilities) if latest.total_current_liabilities is not None else None,
        total_liabilities=float(latest.total_liabilities) if latest.total_liabilities is not None else 0.0,
        total_equity=float(latest.total_equity) if latest.total_equity is not None else 0.0,
        borrowings=latest_borrowings,
    )
    inc = IncomeStatement(
        revenue=float(latest.revenue or 0.0),
        cogs=float(latest.cogs) if (latest.cogs is not None and latest.cogs > 0) else None,
        operating_expenses=float(latest.operating_expenses or 0.0),
        net_income=float(latest.net_income or 0.0),
        operating_profit=float(latest.ebit) if latest.ebit is not None else None,
    )
    ratios = FinancialStatementEngine().compute(bs, inc)
    by_name = {r.name: r.value for r in ratios}

    # Annual cash-balance changes are not a monthly operating-burn measure.
    runway = None

    risk = RiskDetectionEngine().evaluate(
        RiskInputs(
            current_ratio=by_name.get("current_ratio"),
            debt_to_equity=by_name.get("debt_to_equity"),
            net_margin_pct=by_name.get("net_margin_pct"),
            cash_runway_months=runway,
        )
    )

    cash_rows = (await session.execute(
        select(CashFlowRow)
        .where(CashFlowRow.business_id == user.business_id)
        .order_by(CashFlowRow.created_at.asc())
    )).scalars().all()

    biz = (await session.execute(select(Business).where(Business.id == user.business_id))).scalar_one_or_none()
    company_name = biz.name if biz and biz.name not in ("User Workspace", "My Business") else ""

    # Compute historical ratios for all periods
    all_period_ratios: dict[str, list[dict]] = {}
    ratio_series_map: dict[str, list[float]] = {}
    for r in rows:
        r_borrowings = (
            float((r.short_term_debt or 0.0) + (r.long_term_debt or 0.0))
            if (r.short_term_debt is not None or r.long_term_debt is not None)
            else None
        )
        r_bs = BalanceSheet(
            cash=float(r.cash) if r.cash is not None else None,
            accounts_receivable=float(r.accounts_receivable) if r.accounts_receivable is not None else None,
            inventory=float(r.inventory) if r.inventory is not None else None,
            other_current_assets=float(r.other_current_assets) if r.other_current_assets is not None else None,
            total_current_assets=float(r.total_current_assets) if r.total_current_assets is not None else None,
            total_assets=float(r.total_assets or 0.0),
            total_current_liabilities=float(r.total_current_liabilities) if r.total_current_liabilities is not None else None,
        total_liabilities=float(r.total_liabilities) if r.total_liabilities is not None else 0.0,
        total_equity=float(r.total_equity) if r.total_equity is not None else 0.0,
            borrowings=r_borrowings,
        )
        r_inc = IncomeStatement(
            revenue=float(r.revenue or 0.0),
            cogs=float(r.cogs) if (r.cogs is not None and r.cogs > 0) else None,
            operating_expenses=float(r.operating_expenses or 0.0),
            net_income=float(r.net_income or 0.0),
            operating_profit=float(r.ebit) if r.ebit is not None else None,
        )
        computed = FinancialStatementEngine().compute(r_bs, r_inc)
        all_period_ratios[r.period] = [c.__dict__ for c in computed]
        for c in computed:
            if c.value is not None:
                ratio_series_map.setdefault(c.name, []).append(round(c.value, 4))

    return {
        "available": True,
        "company_name": company_name,
        "source": latest.source,
        "verified": latest.verified,
        "data_label": "DEMO DATA" if latest.source == "demo" else ("VERIFIED" if latest.verified else "SUBMITTED"),
        "period": latest.period,
        "periods": [r.period for r in rows],
        "records": [_to_out(r).model_dump() for r in rows],
        "ratios": [r.__dict__ for r in ratios],
        "ratios_by_period": all_period_ratios,
        "ratio_series": ratio_series_map,
        "risk": {
            "overall_score": risk.overall_score,
            "overall_level": risk.overall_level.value,
            "flags": [f.__dict__ | {"level": f.level.value} for f in risk.flags],
        },
        "cash_series": cash_series,
        "cash_series_periods": cash_series_periods,
        "cash_runway_months": runway,
        "cashflow_records": [as_dict(r) for r in cash_rows],
        "profit_margin_pct": by_name.get("net_margin_pct"),
    }
