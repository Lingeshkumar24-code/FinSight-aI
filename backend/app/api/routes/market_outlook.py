"""Live benchmark market data (Twelve Data) and investment outlook.

Additive to the NSE quote/prediction stack in :mod:`app.api.routes.market`:

  GET  /market/overview   real quotes for the watchlist (cached 5 min)
  GET  /market/search     ticker/company search (cached 1 hour)
  GET  /market/history    daily/weekly bars for one symbol (cached 30 min)
  GET  /market/usage      credits used / plan limits
  POST /market/outlook    expected profit and potential loss for an amount,
                          horizon and the owner's available cash

Every provider call costs credits (8/minute, one per symbol on the free
plan), so replies carry ``cached`` where it matters and the client caches
aggressively.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.routes import alerts as alerts_routes
from app.config import Settings, get_settings
from app.core.security import TokenPayload, get_current_user
from app.engines.investment_outlook import InvestmentOutlookEngine
from app.models.schemas import AlertItem
from app.models.schemas_ext import (
    InvestmentOutlookRequest,
    InvestmentOutlookResponse,
    MarketHistory,
    MarketOverview,
    MarketPricePoint,
    MarketSearchResult,
    MarketUsage,
)
from app.services.twelve_data import MarketDataError, TwelveDataClient

router = APIRouter(prefix="/market", tags=["market"])

_SYMBOL_RE = re.compile(r"^[A-Z0-9][A-Z0-9./:_-]{0,23}$")
_INTERVALS = {
    "1min",
    "5min",
    "15min",
    "30min",
    "45min",
    "1h",
    "2h",
    "4h",
    "1day",
    "1week",
    "1month",
}
_outlook_engine = InvestmentOutlookEngine()


@lru_cache
def _client_for(api_key: str, base_url: str) -> TwelveDataClient:
    return TwelveDataClient(api_key, base_url)


def _client(settings: Settings) -> TwelveDataClient:
    return _client_for(settings.TWELVEDATA_API_KEY, settings.TWELVEDATA_BASE_URL)


@lru_cache
def _get_fallback_market_service():
    from app.services.market_data import (
        DemoMarketDataProvider,
        MarketDataService,
        YahooChartProvider,
        YFinanceProvider,
    )

    return MarketDataService(
        YahooChartProvider(), YFinanceProvider(), DemoMarketDataProvider()
    )


def _clean_symbol(symbol: str) -> str:
    cleaned = symbol.strip().upper()
    if not _SYMBOL_RE.match(cleaned):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported symbol: {symbol}",
        )
    return cleaned


def _parse_symbols(raw: str | None, settings: Settings) -> list[str]:
    if raw:
        symbols = [part.strip().upper() for part in raw.split(",") if part.strip()]
    else:
        symbols = [
            part.strip().upper()
            for part in settings.MARKET_WATCHLIST.split(",")
            if part.strip()
        ]
    for symbol in symbols:
        if not _SYMBOL_RE.match(symbol):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Unsupported symbol: {symbol}",
            )
    if len(symbols) > settings.MARKET_MAX_SYMBOLS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"At most {settings.MARKET_MAX_SYMBOLS} symbols per request - the free "
                "Twelve Data plan allows 8 credits/minute at one credit per symbol."
            ),
        )
    return symbols


@router.get("/overview", response_model=MarketOverview)
async def market_overview(
    symbols: str | None = Query(
        None, description="Comma-separated tickers; defaults to MARKET_WATCHLIST"
    ),
    _user: TokenPayload = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> MarketOverview:
    """Real quotes for the watchlist (cached for 5 minutes server-side)."""
    client = _client(settings)
    try:
        quotes, cached = await client.quotes_with_source(
            _parse_symbols(symbols, settings)
        )
    except MarketDataError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    return MarketOverview(
        quotes=quotes,
        as_of=datetime.now(timezone.utc).isoformat(timespec="seconds"),
        cached=cached,
    )


@router.get("/search", response_model=list[MarketSearchResult])
async def market_search(
    q: str = Query(..., min_length=1, max_length=40, examples=["apple"]),
    _user: TokenPayload = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> list[MarketSearchResult]:
    """Company/ticker search (cached for an hour, so re-typing is free)."""
    try:
        return await _client(settings).search(q)
    except MarketDataError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


@router.get("/history", response_model=MarketHistory)
async def market_history(
    symbol: str = Query(..., min_length=1, max_length=24, examples=["SPY"]),
    interval: str = Query(
        "1day", description="1min | 5min | 15min | 30min | 1h | 1day | 1week | 1month"
    ),
    outputsize: int = Query(30, ge=5, le=365),
    _user: TokenPayload = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> MarketHistory:
    """Close-price history for one symbol (cached for 30 minutes)."""
    if interval not in _INTERVALS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported interval: {interval}. Use one of {sorted(_INTERVALS)}.",
        )
    client = _client(settings)
    if not (symbol.endswith(".NS") or symbol.endswith(".BO")):
        try:
            return await client.history(symbol, interval=interval, outputsize=outputsize)
        except MarketDataError:
            pass

    # Seamless fallback to internal market service
    try:
        market_service = _get_fallback_market_service()
        bars, _, _ = await market_service.history(symbol, days=outputsize * 2)
        if bars:
            points = [
                MarketPricePoint(
                    datetime=b.date,
                    open=b.open,
                    high=b.high,
                    low=b.low,
                    close=b.close,
                    volume=int(b.volume) if b.volume else 0,
                )
                for b in bars[-outputsize:]
            ]
            return MarketHistory(
                symbol=symbol,
                interval=interval,
                currency="INR" if symbol.endswith(".NS") or symbol.endswith(".BO") else "USD",
                exchange="NSE" if symbol.endswith(".NS") else "BSE" if symbol.endswith(".BO") else "",
                points=points,
            )
    except Exception:
        pass

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Historical data not available for symbol: {symbol}",
    )


@router.get("/usage", response_model=MarketUsage | None)
async def market_usage(
    _user: TokenPayload = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> MarketUsage | None:
    """Remaining Twelve Data credits for this plan, if the provider answers."""
    return await _client(settings).usage()


@router.post("/outlook", response_model=InvestmentOutlookResponse)
async def market_outlook(
    payload: InvestmentOutlookRequest,
    user: TokenPayload = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> InvestmentOutlookResponse:
    """Expected profit and potential loss for an investment amount.

    Deterministic statistics over the symbol's own daily closes (drift,
    volatility, 80% range, 95% VaR, drawdown), plus notes tied to the
    owner's available cash. ``notify`` also raises an in-app alert and
    forwards it to n8n when the webhook is configured.
    """
    symbol = _clean_symbol(payload.symbol)
    client = _client(settings)
    closes: list[float] = []

    # If the symbol is not an explicit Indian suffix (.NS / .BO), attempt TwelveData first
    if not (symbol.endswith(".NS") or symbol.endswith(".BO")):
        try:
            history = await client.history(symbol, interval="1day", outputsize=260)
            closes = [p.close for p in history.points if p.close is not None]
        except MarketDataError:
            closes = []

    # If TwelveData failed or symbol is Indian equity (.NS / .BO), fallback to internal market service
    if not closes:
        try:
            market_service = _get_fallback_market_service()
            bars, _, _ = await market_service.history(symbol, days=365)
            closes = [b.close for b in bars if b.close is not None]
        except Exception:
            closes = []

    if not closes or len(closes) < 10:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unable to load sufficient historical price data for {symbol}. Please verify the ticker symbol.",
        )
    try:
        outlook = _outlook_engine.analyze(
            closes,
            payload.amount,
            payload.horizon_months,
            symbol=symbol,
            cash_available=payload.cash_available,
            monthly_net_income=payload.monthly_net_income,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc

    alert: AlertItem | None = None
    if payload.notify:
        direction = "gain" if outlook.expected_profit >= 0 else "loss"
        alert_dict = alerts_routes.push_alert(
            user.business_id,
            title=f"Investment Outlook: {symbol} {payload.horizon_months}mo",
            message=(
                f"₹{payload.amount:,.0f} in {symbol} over {payload.horizon_months} month(s): "
                f"expected {direction} of ₹{abs(outlook.expected_profit):,.0f} "
                f"({outlook.expected_profit_pct:+.1f}%); 80% range "
                f"₹{outlook.worst_case_value:,.0f}-₹{outlook.best_case_value:,.0f}; "
                f"95% VaR ₹{outlook.var_95_loss:,.0f}; "
                f"chance of loss {outlook.probability_of_loss_pct:.0f}%."
            ),
            severity=(
                "critical"
                if outlook.probability_of_loss_pct >= 50
                else "watch"
                if outlook.probability_of_loss_pct >= 30
                else "info"
            ),
            source="risk_engine",
        )
        await alerts_routes.dispatch_alert_to_n8n(alert_dict, settings)
        alert = AlertItem(**alert_dict)

    return InvestmentOutlookResponse(
        symbol=symbol,
        investment=payload.amount,
        horizon_months=payload.horizon_months,
        horizon_days=outlook.horizon_days,
        annualized_return_pct=outlook.annualized_return_pct,
        annualized_volatility_pct=outlook.annualized_volatility_pct,
        sharpe_like=outlook.sharpe_like,
        expected_value=outlook.expected_value,
        expected_profit=outlook.expected_profit,
        expected_profit_pct=outlook.expected_profit_pct,
        best_case_value=outlook.best_case_value,
        best_case_profit=outlook.best_case_profit,
        worst_case_value=outlook.worst_case_value,
        worst_case_profit=outlook.worst_case_profit,
        var_95_value=outlook.var_95_value,
        var_95_loss=outlook.var_95_loss,
        probability_of_loss_pct=outlook.probability_of_loss_pct,
        max_drawdown_pct=outlook.max_drawdown_pct,
        observations=outlook.observations,
        notes=outlook.notes,
        as_of=datetime.now(timezone.utc).isoformat(timespec="seconds"),
        latest_close=closes[-1] if closes else None,
        alert=alert,
    )
