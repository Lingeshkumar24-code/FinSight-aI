import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, ApiError, type DashboardSummary, type Portfolio, type Snapshot, type Trade } from "../lib/api";
import { Card } from "../components/ui/Card";

function rupees(value: number): string {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

type RiskProfile = "conservative" | "balanced" | "growth";

function numericField(record: Record<string, unknown> | undefined, key: string): string {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

function latestFinancialRecord(summary: DashboardSummary): Record<string, unknown> | undefined {
  const records = summary.records ?? [];
  return records.find((record) => numericField(record, "revenue") || numericField(record, "total_assets")) ?? records[records.length - 1];
}

function ageEquityLimit(age: number): number {
  if (age <= 35) return 85;
  if (age <= 50) return 70;
  if (age <= 60) return 55;
  return 40;
}

export function PaperTrading() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Trade[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [portfolioName, setPortfolioName] = useState("Growth Model");
  const [initialCash, setInitialCash] = useState(100000);
  const [investorAge, setInvestorAge] = useState("");
  const [riskProfile, setRiskProfile] = useState<RiskProfile>("balanced");
  const [companyRevenue, setCompanyRevenue] = useState("");
  const [companyAssets, setCompanyAssets] = useState("");
  const [generatedPlan, setGeneratedPlan] = useState<{ age: number; risk: RiskProfile; equityPct: number; equityBudget: number; cashReserve: number; revenue: string; assets: string } | null>(null);
  const [symbol, setSymbol] = useState("TCS.NS");
  const [side, setSide] = useState("buy");
  const [quantity, setQuantity] = useState(10);
  const [price, setPrice] = useState<string>("");
  const [fee, setFee] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const refreshPortfolios = useCallback(async () => {
    const list = await api.listPortfolios();
    setPortfolios(list);
    setSelectedId((current) => (current && list.some((item) => item.id === current) ? current : (list[0]?.id ?? null)));
    return list;
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [list] = await Promise.all([refreshPortfolios(), api.getDashboard().then((summary) => {
          const record = latestFinancialRecord(summary);
          if (record) {
            setCompanyRevenue(numericField(record, "revenue"));
            setCompanyAssets(numericField(record, "total_assets"));
          }
        }).catch(() => undefined)]);
        if (!cancelled) setSelectedId(list[0]?.id ?? null);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load portfolios");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [refreshPortfolios]);

  useEffect(() => {
    if (!selectedId) {
      setTransactions([]);
      setSnapshots([]);
      return;
    }
    let cancelled = false;
    async function loadDetails() {
      if (!selectedId) return;
      try {
        const [tradeList, snapshotList] = await Promise.all([
          api.getTransactions(selectedId),
          api.getSnapshots(selectedId),
        ]);
        if (!cancelled) {
          setTransactions(tradeList);
          setSnapshots(snapshotList);
        }
      } catch (err) {
        if (!cancelled) setActionError(err instanceof ApiError ? err.message : "Failed to load portfolio history");
      }
    }
    void loadDetails();
    return () => { cancelled = true; };
  }, [selectedId]);

  const selected = portfolios.find((item) => item.id === selectedId) ?? null;

  async function createPortfolio(event: FormEvent) {
    event.preventDefault();
    const age = Number(investorAge);
    if (!Number.isInteger(age) || age < 18 || age > 100 || !Number.isFinite(initialCash) || initialCash <= 0) {
      setActionError("Enter an age from 18 to 100 and positive virtual cash.");
      return;
    }
    const riskEquity = { conservative: 35, balanced: 60, growth: 80 }[riskProfile];
    const equityPct = Math.min(riskEquity, ageEquityLimit(age));
    const equityBudget = Math.round(initialCash * equityPct / 100);
    const cashReserve = initialCash - equityBudget;
    setBusy(true);
    setActionError(null);
    try {
      const created = await api.createPortfolio(portfolioName, initialCash);
      await refreshPortfolios();
      setSelectedId(created.id);
      setGeneratedPlan({ age, risk: riskProfile, equityPct, equityBudget, cashReserve, revenue: companyRevenue, assets: companyAssets });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not create portfolio");
    } finally {
      setBusy(false);
    }
  }

  async function submitTrade(event: FormEvent) {
    event.preventDefault();
    if (!selectedId) return;
    setBusy(true);
    setActionError(null);
    try {
      await api.executeTrade(selectedId, {
        symbol,
        side,
        quantity,
        fee,
        ...(price.trim() ? { price: Number(price) } : {}),
      });
      const [list, tradeList] = await Promise.all([refreshPortfolios(), api.getTransactions(selectedId)]);
      setTransactions(tradeList);
      const updated = list.find((item) => item.id === selectedId);
      if (updated) setPortfolios(list);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Trade rejected");
    } finally {
      setBusy(false);
    }
  }

  async function captureSnapshot() {
    if (!selectedId) return;
    setBusy(true);
    setActionError(null);
    try {
      await api.takeSnapshot(selectedId);
      setSnapshots(await api.getSnapshots(selectedId));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not capture snapshot");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="skeleton" style={{ height: 320 }} data-testid="paper-trading-page" />;
  if (error) return <div className="page-state is-error"><p className="error-text">{error}</p></div>;

  return (
    <div className="page-enter flex flex-col gap-5 w-full" data-testid="paper-trading-page">
      <div className="page-header">
        <div>
          <div className="page-kicker">
            <h1>Paper Trading Simulator</h1>
            <span className="data-badge is-demo">virtual capital</span>
          </div>
          <p className="page-lead">
            Practice execution logic with virtual cash. Prices are delayed or demo data; no real orders are placed.
          </p>
        </div>
        <button className="btn btn-secondary" type="button" onClick={() => void captureSnapshot()} disabled={!selectedId || busy}>
          Capture snapshot
        </button>
      </div>

      {actionError && <div className="page-state is-error"><p className="error-text">{actionError}</p></div>}

      <div className="trading-grid">
        <div className="flex flex-col gap-5">
          <Card>
            <div className="section-header">
              <h2>Virtual Portfolios</h2>
              <span className="section-run">{portfolios.length} active</span>
            </div>
            <div className="portfolio-list" data-testid="portfolio-list">
              {portfolios.length === 0 && <p className="muted-note">Create a portfolio to begin.</p>}
              {portfolios.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`portfolio-row ${item.id === selectedId ? "is-active" : ""}`}
                  onClick={() => setSelectedId(item.id)}
                >
                  <span>{item.name}</span>
                  <strong className="num">{rupees(item.total_value)}</strong>
                  <small>{item.total_return_pct >= 0 ? "+" : ""}{item.total_return_pct}%</small>
                </button>
              ))}
            </div>
            <form className="form-grid-2 mt-3" onSubmit={createPortfolio}>
              <div>
                <label htmlFor="portfolio-name">Name</label>
                <input id="portfolio-name" value={portfolioName} onChange={(event) => setPortfolioName(event.target.value)} />
              </div>
              <div>
                <label htmlFor="investor-age">Investor age</label>
                <input id="investor-age" type="number" min="18" max="100" required value={investorAge} onChange={(event) => setInvestorAge(event.target.value)} placeholder="e.g. 35" />
              </div>
              <div>
                <label htmlFor="risk-profile">Risk appetite</label>
                <select id="risk-profile" value={riskProfile} onChange={(event) => setRiskProfile(event.target.value as RiskProfile)}>
                  <option value="conservative">Conservative</option>
                  <option value="balanced">Balanced</option>
                  <option value="growth">Growth</option>
                </select>
              </div>
              <div>
                <label htmlFor="company-revenue">Uploaded company revenue (₹)</label>
                <input id="company-revenue" type="number" min="0" value={companyRevenue} onChange={(event) => setCompanyRevenue(event.target.value)} placeholder="Not available" />
              </div>
              <div>
                <label htmlFor="company-assets">Uploaded company assets (₹)</label>
                <input id="company-assets" type="number" min="0" value={companyAssets} onChange={(event) => setCompanyAssets(event.target.value)} placeholder="Not available" />
              </div>
              <div>
                <label htmlFor="initial-cash">Virtual cash</label>
                <input id="initial-cash" type="number" min="1" required value={initialCash} onChange={(event) => setInitialCash(Number(event.target.value))} />
              </div>
              <div className="form-action">
                <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Generating…" : "Generate virtual portfolio"}</button>
              </div>
            </form>
            <p className="muted-note mt-3">Revenue and assets are shown as company context only. The allocation uses age, risk appetite, and virtual cash; no real orders are placed. Profile details stay in this session.</p>
          </Card>

          <Card>
            <div className="section-header">
              <h2>Place Virtual Order</h2>
              <span className="section-run">No real settlement</span>
            </div>
            <form className="form-grid-2" onSubmit={submitTrade} data-testid="trade-form">
              <div>
                <label htmlFor="trade-symbol">Symbol</label>
                <input id="trade-symbol" value={symbol} onChange={(event) => setSymbol(event.target.value)} />
              </div>
              <div>
                <label htmlFor="trade-side">Side</label>
                <select id="trade-side" value={side} onChange={(event) => setSide(event.target.value)}>
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                </select>
              </div>
              <div>
                <label htmlFor="trade-quantity">Quantity</label>
                <input id="trade-quantity" type="number" min="1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
              </div>
              <div>
                <label htmlFor="trade-price">Price (blank = latest)</label>
                <input id="trade-price" type="number" min="0" step="0.01" placeholder="Market" value={price} onChange={(event) => setPrice(event.target.value)} />
              </div>
              <div>
                <label htmlFor="trade-fee">Fee</label>
                <input id="trade-fee" type="number" min="0" value={fee} onChange={(event) => setFee(Number(event.target.value))} />
              </div>
              <div className="form-action">
                <button className="btn btn-primary" type="submit" disabled={!selectedId || busy}>
                  {busy ? "Processing…" : `Submit ${side}`}
                </button>
              </div>
            </form>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          {selected ? (
            <>
              <Card>
                {generatedPlan && <div className="flex flex-col gap-3" data-testid="generated-portfolio-plan">
                  <div className="section-header">
                    <div>
                      <h2>Generated virtual allocation</h2>
                      <p className="muted-note">{generatedPlan.age} years · {generatedPlan.risk} risk profile · based on your virtual cash</p>
                    </div>
                    <span className="section-run">Simulation only</span>
                  </div>
                  <div className="kpi-grid">
                    <div className="metric"><div className="metric-label">Equity target ({generatedPlan.equityPct}%)</div><div className="metric-value num">{rupees(generatedPlan.equityBudget)}</div></div>
                    <div className="metric"><div className="metric-label">Cash reserve</div><div className="metric-value num">{rupees(generatedPlan.cashReserve)}</div></div>
                    <div className="metric"><div className="metric-label">Company revenue context</div><div className="metric-value num">{generatedPlan.revenue ? rupees(Number(generatedPlan.revenue)) : "Not available"}</div></div>
                    <div className="metric"><div className="metric-label">Company assets context</div><div className="metric-value num">{generatedPlan.assets ? rupees(Number(generatedPlan.assets)) : "Not available"}</div></div>
                  </div>
                  <p className="muted-note">Planning heuristic for paper trading only; it is not personalized financial advice. No holdings are purchased automatically.</p>
                </div>}
              </Card>
              <Card>
                <div className="section-header">
                  <h2>{selected.name}</h2>
                  <span className="section-run">Marked to delayed prices</span>
                </div>
                <div className="kpi-grid">
                  <div className="metric"><div className="metric-label">Total Value</div><div className="metric-value num">{rupees(selected.total_value)}</div></div>
                  <div className="metric"><div className="metric-label">Cash</div><div className="metric-value num">{rupees(selected.cash)}</div></div>
                  <div className="metric"><div className="metric-label">Unrealized P&amp;L</div><div className="metric-value num" style={{ color: selected.unrealized_pnl >= 0 ? "#047857" : "#B91C1C" }}>{rupees(selected.unrealized_pnl)}</div></div>
                  <div className="metric"><div className="metric-label">Realized P&amp;L</div><div className="metric-value num" style={{ color: selected.realized_pnl >= 0 ? "#047857" : "#B91C1C" }}>{rupees(selected.realized_pnl)}</div></div>
                </div>
                <div className="data-table mt-4">
                  <table>
                    <thead><tr><th>Holding</th><th className="num">Qty</th><th className="num">Avg Cost</th><th className="num">Last</th><th className="num">Value</th></tr></thead>
                    <tbody>
                      {selected.holdings.length === 0 && <tr><td colSpan={5} className="muted-note">No open positions.</td></tr>}
                      {selected.holdings.map((holding) => (
                        <tr key={holding.symbol}>
                          <td style={{ fontWeight: 600 }}>{holding.symbol}</td>
                          <td className="num">{holding.quantity}</td>
                          <td className="num">{rupees(holding.average_cost)}</td>
                          <td className="num">{rupees(holding.last_price)}</td>
                          <td className="num">{rupees(holding.market_value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card>
                <div className="section-header"><h2>Order History</h2><span className="section-run">{transactions.length} fills</span></div>
                <div className="data-table">
                  <table>
                    <thead><tr><th>Time</th><th>Side</th><th>Symbol</th><th className="num">Qty</th><th className="num">Price</th><th className="num">P&amp;L</th></tr></thead>
                    <tbody>
                      {transactions.length === 0 && <tr><td colSpan={6} className="muted-note">No virtual orders yet.</td></tr>}
                      {transactions.map((trade) => (
                        <tr key={trade.id}>
                          <td>{new Date(trade.executed_at).toLocaleString()}</td>
                          <td><span className={`pill ${trade.side === "buy" ? "is-good" : "is-watch"}`}>{trade.side}</span></td>
                          <td>{trade.symbol}</td>
                          <td className="num">{trade.quantity}</td>
                          <td className="num">{rupees(trade.price)}</td>
                          <td className="num">{rupees(trade.realized_pnl)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card>
                <div className="section-header"><h2>Portfolio Snapshots</h2><span className="section-run">{snapshots.length} saved</span></div>
                <div className="data-table">
                  <table>
                    <thead><tr><th>Date</th><th className="num">Cash</th><th className="num">Invested</th><th className="num">Total</th></tr></thead>
                    <tbody>
                      {snapshots.length === 0 && <tr><td colSpan={4} className="muted-note">No snapshots captured.</td></tr>}
                      {snapshots.map((snapshot) => (
                        <tr key={snapshot.id}>
                          <td>{snapshot.snapshot_date}</td>
                          <td className="num">{rupees(snapshot.cash)}</td>
                          <td className="num">{rupees(snapshot.invested)}</td>
                          <td className="num">{rupees(snapshot.total_value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          ) : (
            <Card style={{ minHeight: 320, display: "grid", placeItems: "center", textAlign: "center" }}>
              <div>
                <h3>No portfolio selected</h3>
                <p className="muted-note">Create a virtual portfolio to start simulating trades.</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
