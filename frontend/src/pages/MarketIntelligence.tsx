import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, ApiError, type IndicatorsResponse, type PredictionResult, type StockHistory, type StockInfo, type WatchlistItem } from "../lib/api";
import { Card } from "../components/ui/Card";
import { LineChart } from "./Dashboard";

const QUICK_SYMBOLS = ["TCS.NS", "RELIANCE.NS", "INFY.NS", "HDFCBANK.NS", "SBIN.NS"];

function money(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function number(value: number | null | undefined, suffix = ""): string {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(2)}${suffix}`;
}

export function MarketIntelligence() {
  const [symbol, setSymbol] = useState("TCS.NS");
  const [draftSymbol, setDraftSymbol] = useState("TCS.NS");
  const [horizon, setHorizon] = useState(1);
  const [model, setModel] = useState("linear_regression");
  const [quote, setQuote] = useState<StockInfo | null>(null);
  const [history, setHistory] = useState<StockHistory | null>(null);
  const [indicators, setIndicators] = useState<IndicatorsResponse | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [watchDraft, setWatchDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async (target: string) => {
    setLoading(true);
    setError(null);
    try {
      const [quoteData, historyData, indicatorData, predictionData, watchData] = await Promise.all([
        api.getQuote(target),
        api.getMarketHistory(target, 400),
        api.getIndicators(target),
        api.getPredictions(target),
        api.getWatchlist(),
      ]);
      setQuote(quoteData);
      setHistory(historyData);
      setIndicators(indicatorData);
      setPrediction(predictionData[0] ?? null);
      setWatchlist(watchData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load market data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(symbol);
  }, [symbol, load]);

  function submitSymbol(event: FormEvent) {
    event.preventDefault();
    const next = draftSymbol.trim().toUpperCase();
    if (next) setSymbol(next);
  }

  async function runPrediction(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setActionError(null);
    try {
      const result = await api.runPrediction({ symbol, horizon_days: horizon, model, store: true });
      setPrediction(result);
      const stored = await api.getPredictions(symbol);
      setPrediction(stored[0] ?? result);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Prediction failed");
    } finally {
      setBusy(false);
    }
  }

  async function addToWatchlist(event: FormEvent) {
    event.preventDefault();
    const next = watchDraft.trim().toUpperCase();
    if (!next) return;
    setActionError(null);
    try {
      await api.addWatchlist(next);
      setWatchDraft("");
      setWatchlist(await api.getWatchlist());
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not update watchlist");
    }
  }

  async function removeFromWatchlist(target: string) {
    setActionError(null);
    try {
      await api.removeWatchlist(target);
      setWatchlist(await api.getWatchlist());
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not update watchlist");
    }
  }

  const closes = (history?.points ?? []).map((point) => point.close);
  const isDemo = quote?.data_status === "DEMO" || quote?.data_status === "CACHED";

  return (
    <div className="page-enter flex flex-col gap-5 w-full" data-testid="market-page">
      <div className="page-header">
        <div>
          <div className="page-kicker">
            <h1>Market Intelligence</h1>
            {quote && (
              <span className={`data-badge ${isDemo ? "is-demo" : "is-live"}`}>
                {quote.data_status.toLowerCase()} data
              </span>
            )}
          </div>
          <p className="page-lead">
            Technical indicators and ML forecasts for Indian equities. Historical/delayed prices are never represented as live exchange quotes.
          </p>
        </div>
        <form className="filter-bar" onSubmit={submitSymbol}>
          <label htmlFor="market-symbol">Symbol</label>
          <input
            id="market-symbol"
            value={draftSymbol}
            onChange={(event) => setDraftSymbol(event.target.value)}
            style={{ width: 160 }}
          />
          <button className="btn btn-primary" type="submit">Load</button>
        </form>
      </div>

      <div className="quick-symbols">
        {QUICK_SYMBOLS.map((item) => (
          <button
            key={item}
            type="button"
            className={`quick-symbol ${symbol === item ? "is-active" : ""}`}
            onClick={() => {
              setDraftSymbol(item);
              setSymbol(item);
            }}
          >
            {item.replace(".NS", "")}
          </button>
        ))}
      </div>

      {error && <div className="page-state is-error"><p className="error-text">{error}</p></div>}
      {actionError && <div className="page-state is-error"><p className="error-text">{actionError}</p></div>}
      {loading && !quote && <div className="skeleton" style={{ height: 220 }} />}

      {quote && (
        <>
          <div className="kpi-grid">
            <div className="metric">
              <div className="metric-label">Last Close</div>
              <div className="metric-value num">{money(quote.latest_price)}</div>
              <div className="metric-note">{quote.name} · {quote.as_of}</div>
            </div>
            <div className="metric">
              <div className="metric-label">Daily Change</div>
              <div className="metric-value num" style={{ color: (quote.daily_change ?? 0) >= 0 ? "#047857" : "#B91C1C" }}>
                {number(quote.daily_change)}
              </div>
              <div className="metric-note">{number(quote.daily_change_pct, "%")} versus previous session</div>
            </div>
            <div className="metric">
              <div className="metric-label">Trend</div>
              <div className="metric-value" style={{ fontSize: 20, textTransform: "capitalize" }}>{quote.trend.replace("_", " ")}</div>
              <div className="metric-note">20-session direction</div>
            </div>
            <div className="metric">
              <div className="metric-label">Volume</div>
              <div className="metric-value num" style={{ fontSize: 20 }}>{(quote.volume ?? 0).toLocaleString("en-IN")}</div>
              <div className="metric-note">Source: {quote.source}</div>
            </div>
          </div>

          <Card>
            <div className="section-header">
              <h2>{symbol} Price History</h2>
              <span className="section-run">Adjusted close · {closes.length} sessions</span>
            </div>
            {closes.length > 1 ? (
              <LineChart data={closes} width={720} height={150} color={isDemo ? "#B45309" : "#047857"} />
            ) : (
              <div className="skeleton" style={{ height: 150 }} />
            )}
          </Card>
        </>
      )}

      <div className="market-grid">
        <Card>
          <div className="section-header">
            <h2>ML Price Forecast</h2>
            <span className="section-run">Causal features · walk-forward test</span>
          </div>
          <form className="form-grid-3" onSubmit={runPrediction}>
            <div>
              <label htmlFor="horizon">Horizon</label>
              <select id="horizon" value={horizon} onChange={(event) => setHorizon(Number(event.target.value))}>
                <option value={1}>1 session</option>
                <option value={5}>5 sessions</option>
                <option value={30}>30 sessions</option>
              </select>
            </div>
            <div>
              <label htmlFor="model">Model</label>
              <select id="model" value={model} onChange={(event) => setModel(event.target.value)}>
                <option value="linear_regression">Linear Regression</option>
                <option value="random_forest">Random Forest</option>
                <option value="xgboost">XGBoost (if installed)</option>
              </select>
            </div>
            <div className="form-action">
              <button className="btn btn-primary" type="submit" disabled={busy || loading}>
                {busy ? "Training…" : "Run forecast"}
              </button>
            </div>
          </form>

          {prediction ? (
            <div className="prediction-hero" data-testid="prediction-result">
              <div>
                <span className="chart-trend-label">Predicted close</span>
                <strong className="num">{money(prediction.predicted_price)}</strong>
                <span className={`pill ${prediction.predicted_direction === "up" ? "is-good" : prediction.predicted_direction === "down" ? "is-bad" : "is-watch"}`}>
                  {prediction.predicted_direction}
                </span>
              </div>
              <div className="prediction-range">
                <span className="chart-trend-label">95% interval</span>
                <span className="num">{money(prediction.lower_bound)} – {money(prediction.upper_bound)}</span>
              </div>
              <div className="prediction-metrics">
                <div><span>MAE</span><strong className="num">{number(prediction.metrics.mae)}</strong></div>
                <div><span>RMSE</span><strong className="num">{number(prediction.metrics.rmse)}</strong></div>
                <div><span>Direction</span><strong className="num">{number(prediction.metrics.directional_accuracy, "%")}</strong></div>
                <div><span>Test rows</span><strong className="num">{prediction.metrics.sample_size ?? "—"}</strong></div>
              </div>
            </div>
          ) : (
            <p className="muted-note">Run a forecast to see predictions and out-of-sample metrics.</p>
          )}
          <p className="disclaimer">
            Forecasts are probabilistic estimates from historical data, not investment advice or live trading signals.
          </p>
        </Card>

        <Card>
          <div className="section-header">
            <h2>Technical Indicators</h2>
            <span className="section-run">Causal rolling windows</span>
          </div>
          {indicators ? (
            <div className="data-table" style={{ maxHeight: 420, overflowY: "auto" }}>
              <table>
                <thead>
                  <tr><th>Indicator</th><th className="num">Latest</th><th>Explanation</th></tr>
                </thead>
                <tbody>
                  {indicators.indicators.map((item) => {
                    const last = item.values[item.values.length - 1];
                    return (
                      <tr key={item.indicator}>
                        <td style={{ fontWeight: 600 }}>{item.indicator.replace(/_/g, " ")}</td>
                        <td className="num">{last ? number(last.value, last.signal ? ` · ${last.signal}` : "") : "—"}</td>
                        <td style={{ color: "var(--ink-muted)", fontSize: 12 }}>{item.description}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="skeleton" style={{ height: 300 }} />
          )}
        </Card>
      </div>

      <Card>
        <div className="section-header">
          <h2>Alert Watchlist</h2>
          <span className="section-run">Threshold monitoring configuration</span>
        </div>
        <form className="filter-bar" onSubmit={addToWatchlist} data-testid="watchlist-add">
          <label htmlFor="watch-symbol">Add symbol</label>
          <input id="watch-symbol" value={watchDraft} onChange={(event) => setWatchDraft(event.target.value)} style={{ width: 160 }} />
          <button className="btn btn-secondary" type="submit">Add</button>
        </form>
        <div className="data-table mt-3">
          <table>
            <thead><tr><th>Symbol</th><th className="num">Threshold</th><th>Status</th><th /></tr></thead>
            <tbody>
              {watchlist.length === 0 && (
                <tr><td colSpan={4} style={{ color: "var(--ink-muted)" }}>No symbols on the watchlist.</td></tr>
              )}
              {watchlist.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600 }}>{item.symbol}</td>
                  <td className="num">{item.threshold_pct}%</td>
                  <td><span className={`pill ${item.enabled ? "is-good" : "is-watch"}`}>{item.enabled ? "enabled" : "paused"}</span></td>
                  <td><button type="button" className="link-button" onClick={() => void removeFromWatchlist(item.symbol)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
