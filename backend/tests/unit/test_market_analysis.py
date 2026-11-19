from app.engines.market_indicators import ema, macd, rsi, sma
from app.engines.market_prediction import StockPredictionEngine
from app.services.market_data import DemoMarketDataProvider


def test_sma_ema_rsi_known_values() -> None:
    assert sma([1, 2, 3, 4, 5], 3) == [None, None, 2.0, 3.0, 4.0]
    assert ema([1, 2, 3], 2)[:3] == [1.0, 1.6667, 2.5556]
    rising = list(range(1, 31))
    rsi_values = rsi(rising, 14)
    assert rsi_values[14] == 100.0
    assert all(value is None for value in rsi_values[:14])
    macd_values = macd(rising)
    assert len(macd_values["macd"]) == 30
    assert macd_values["macd"][-1] is not None


def test_prediction_is_chronological_and_bounded() -> None:
    bars = DemoMarketDataProvider().get_history("TCS.NS", days=220)
    result = StockPredictionEngine().predict("TCS.NS", bars, horizon_days=1, model="linear_regression")
    assert result.predicted_direction in ("up", "down", "flat")
    assert result.lower_bound <= result.predicted_price <= result.upper_bound
    assert result.evaluation.sample_size > 0
    assert result.evaluation.mae >= 0
    assert result.evaluation.rmse >= 0
    splits = [step["split_index"] for step in result.evaluation.backtest]
    assert splits == sorted(splits)
    assert all(splits[i] < splits[i + 1] for i in range(len(splits) - 1))
    assert result.feature_count == 9


def test_prediction_rejects_short_history_and_bad_horizon() -> None:
    bars = DemoMarketDataProvider().get_history("INFY.NS", days=40)
    try:
        StockPredictionEngine().predict("INFY.NS", bars, horizon_days=1)
    except ValueError as error:
        assert "at least 80" in str(error)
    else:
        raise AssertionError("short history should be rejected")
    try:
        StockPredictionEngine().predict("INFY.NS", bars, horizon_days=7)
    except ValueError as error:
        assert "horizon_days" in str(error)
    else:
        raise AssertionError("unsupported horizon should be rejected")
