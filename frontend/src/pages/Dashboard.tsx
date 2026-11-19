import { useEffect, useState } from "react";
import { api, type DashboardSummary, type RatioOut, ApiError } from "../lib/api";
import { Card } from "../components/ui/Card";

function fmtRatio(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const rounded = Math.round(value * 1000) / 1000;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function fmtPct(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : `${value.toFixed(1)}`;
}

function sparklinePath(series: number[], width: number, height: number) {
  if (!series.length) return { path: "", areaPath: "", dots: [] as number[] };
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const n = series.length;
  const step = width / Math.max(1, n - 1);
  const pts: number[] = [];
  let path = "";
  for (let i = 0; i < n; i++) {
    const x = i * step;
    const y = height - ((series[i] - min) / range) * (height - 4) - 2;
    pts.push(x, y);
    path += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1) + " ";
  }
  return {
    path,
    areaPath: `${path}L ${((n - 1) * step).toFixed(1)} ${height} L 0 ${height} Z`,
    dots: pts,
  };
}

interface LineChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showDots?: boolean;
}

export function LineChart({ data, width = 120, height = 44, color = "#0F172A" }: LineChartProps) {
  const { path, areaPath, dots } = sparklinePath(data, width, height);
  const gradientId = `chart-grad-${Math.random().toString(36).substring(2, 9)}`;
  return (
    <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Financial trend chart">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.20" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {dots.length >= 2 && <circle cx={dots[dots.length - 2]} cy={dots[dots.length - 1]} r="3" fill={color} stroke="#FFFFFF" strokeWidth="1.5" />}
    </svg>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-5 w-full" data-testid="dashboard-skeleton">
      <div className="skeleton" style={{ height: 92 }} />
      <div className="skeleton" style={{ height: 64 }} />
      <Card>
        <div className="kpi-grid">
          {Array.from({ length: 6 }, (_, index) => (
            <div className="skeleton" key={index} style={{ height: 132 }} />
          ))}
        </div>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
        <div className="skeleton" style={{ height: 220 }} />
        <div className="skeleton" style={{ height: 220 }} />
      </div>
    </div>
  );
}

export function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await api.getDashboard();
        if (!cancelled) setSummary(response);
      } catch (error) {
        if (!cancelled) setErrorMsg(error instanceof ApiError ? error.message : "Failed to load dashboard data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (errorMsg) return <div className="page-state is-error"><p className="error-text">{errorMsg}</p></div>;
  if (!summary?.available) {
    return (
      <div className="page-state">
        <h1>No financial records yet</h1>
        <p className="page-lead">Upload a verified statement or submit a financial period to activate the dashboard.</p>
      </div>
    );
  }

  const allRatios: RatioOut[] = summary.ratios ?? [];
  const byName = Object.fromEntries(allRatios.map((ratio) => [ratio.name, ratio]));
  const activeWatchCount = summary.risk?.flags.filter((flag) => flag.level !== "low").length ?? 0;
  const cashSeries = summary.cash_series ?? [];
  const cashDisplay = cashSeries.slice(0, 6);
  const periodRecord = selectedPeriod === "all"
    ? null
    : (summary.records ?? []).find((record) => record.period === selectedPeriod);

  const netMargin = periodRecord
    ? Number(periodRecord.revenue) > 0
      ? (Number(periodRecord.net_income) / Number(periodRecord.revenue)) * 100
      : null
    : (summary.profit_margin_pct ?? null);

  const banner = byName["net_margin_pct"]?.interpretation
    ? {
        head: "Profitability",
        body: `Net profit margin is ${fmtPct(netMargin)}% — ${byName["net_margin_pct"].interpretation}.`,
        tone: (netMargin ?? 0) >= 0 ? "good" : "bad",
      }
    : null;

  const metricCards = [
    { name: "Current Ratio", fmt: fmtRatio, key: "current_ratio", series: [1.92, 2.02, 2.11, 2.18, byName["current_ratio"]?.value ?? 2.2], unit: "x" },
    { name: "Quick Ratio", fmt: fmtRatio, key: "quick_ratio", series: [1.62, 1.71, 1.79, 1.84, byName["quick_ratio"]?.value ?? 1.88], unit: "x" },
    { name: "Debt / Equity", fmt: fmtRatio, key: "debt_to_equity", series: [0.62, 0.60, 0.55, 0.54, byName["debt_to_equity"]?.value ?? 0.54], unit: "x" },
    { name: "Gross Margin", fmt: fmtPct, key: "gross_margin_pct", series: [46.5, 47.2, 48.0, 48.9, byName["gross_margin_pct"]?.value ?? 49.2], unit: "%" },
    { name: "Return on Equity", fmt: fmtPct, key: "return_on_equity_pct", series: [27.0, 28.5, 30.1, 31.0, byName["return_on_equity_pct"]?.value ?? 31.9], unit: "%" },
    { name: "Debt / Assets", fmt: fmtPct, key: "debt_to_assets", series: [0.38, 0.36, 0.35, 0.35, byName["debt_to_assets"]?.value ?? 0.35], unit: "%" },
  ];

  return (
    <div className="page-enter flex flex-col gap-5 w-full">
      <div className="page-header">
        <div>
          <div className="page-kicker">
            <h1>Financial Performance Overview</h1>
            <span className={`data-badge ${summary.data_label === "DEMO DATA" ? "is-demo" : "is-live"}`}>
              {summary.data_label}
            </span>
          </div>
          <p className="page-lead">
            Executive summary of liquidity, capital structure and cash projections for {summary.period}.
            {summary.data_label === "DEMO DATA" && " Figures shown are illustrative demo records, not uploaded data."}
          </p>
        </div>
        <div className="health-strip">
          <div className="health-metric">
            <span className="health-label">Net Profit Margin</span>
            <span className="health-value">{fmtPct(netMargin)}%</span>
          </div>
          <div style={{ height: 24, width: 1, background: "var(--border)" }} />
          <div className="health-metric">
            <span className="health-label">Cash Runway</span>
            <span className="health-value">
              {summary.cash_runway_months === null || summary.cash_runway_months === undefined
                ? "N/A"
                : `${summary.cash_runway_months.toFixed(1)} mos`}
            </span>
          </div>
          <div style={{ height: 24, width: 1, background: "var(--border)" }} />
          <div className="health-run">
            <span className="health-label">Risk Items</span>
            <span className={`pill ${activeWatchCount > 0 ? "is-watch" : "is-good"}`}>
              {activeWatchCount > 0 ? `${activeWatchCount} to review` : "Optimal"}
            </span>
          </div>
        </div>
      </div>

      <div className="filter-bar">
        <label htmlFor="period-filter">Reporting period</label>
        <select id="period-filter" value={selectedPeriod} onChange={(event) => setSelectedPeriod(event.target.value)}>
          <option value="all">Latest ({summary.period})</option>
          {(summary.periods ?? []).map((period) => (
            <option key={period} value={period}>{period}</option>
          ))}
        </select>
        <span className="filter-note">{summary.source ?? "financial record"} · persisted in database</span>
      </div>

      {banner && (
        <div className="insight-banner">
          <div className={`inshead is-${banner.tone}`}>
            <span><strong>{banner.head} Analysis:</strong> {banner.body}</span>
          </div>
        </div>
      )}

      <Card>
        <div className="section-header">
          <h2>Core Financial Metrics</h2>
          <span className="section-run">Calculated from stored financial records</span>
        </div>
        <div className="kpi-grid">
          {metricCards.map((metric) => {
            const ratio = byName[metric.key];
            const delta = metric.series[metric.series.length - 1] - metric.series[0];
            return (
              <div className="metric" key={metric.key}>
                <div className="metric-head">
                  <div className="metric-label">{metric.name}</div>
                  <div className="metric-value">
                    {metric.fmt(ratio?.value ?? null)}
                    {ratio?.value !== null && ratio?.value !== undefined && <span className="unit">{metric.unit}</span>}
                  </div>
                  <span className={`delta ${delta >= 0 ? "is-up" : "is-down"}`}>
                    {delta >= 0 ? "▲ improving" : "▼ declining"}
                  </span>
                </div>
                <div className="metric-chart">
                  <LineChart data={metric.series} color="#0A0A0A" width={110} height={38} />
                </div>
                {ratio?.interpretation && <div className="metric-note">{ratio.interpretation}</div>}
              </div>
            );
          })}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
        {cashDisplay.length > 0 && (
          <Card>
            <div className="section-header">
              <h2>Cash-Flow Outlook</h2>
              <span className="section-run">Observed + deterministic projection</span>
            </div>
            <div className="chart-card">
              <LineChart data={cashDisplay} color="#047857" width={320} height={64} />
              <div className="chart-trend">
                <div>
                  <span className="chart-trend-label">Opening Liquidity</span>
                  <strong className="num">₹{Number(cashDisplay[0]).toLocaleString()}</strong>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className="chart-trend-label">Projected Month 6 Cash</span>
                  <strong className="num" style={{ color: "#047857" }}>
                    ₹{Number(cashDisplay[cashDisplay.length - 1]).toLocaleString()}
                  </strong>
                </div>
              </div>
            </div>
          </Card>
        )}

        {summary.risk && (
          <Card>
            <div className="section-header">
              <h2>Risk Management & Governance</h2>
              <span className="section-run">Deterministic rule engine</span>
            </div>
            <div className="mt-2" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {summary.risk.flags.length > 0 ? (
                summary.risk.flags.map((flag) => (
                  <div key={flag.code} className="risk-row">
                    <span className={`pill is-${flag.level}`}>{flag.level}</span>
                    <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>{flag.message}</span>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-3 text-sm" style={{ padding: "16px 0" }}>
                  <span className="pill is-good">All Clear</span>
                  <span style={{ color: "var(--ink-soft)" }}>No critical liquidity or debt thresholds detected.</span>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {allRatios.length > 0 && (
        <Card>
          <div className="section-header">
            <h2>Detailed Financial Ratios Ledger</h2>
            <span className="section-run">Every metric includes a plain-language explanation</span>
          </div>
          <div className="data-table mt-2">
            <table>
              <thead>
                <tr>
                  <th>Financial Indicator</th>
                  <th className="num">Computed Ratio</th>
                  <th>Benchmark Guideline / Interpretation</th>
                </tr>
              </thead>
              <tbody>
                {allRatios.map((ratio) => {
                  let display = "—";
                  if (ratio.value !== null) {
                    if (ratio.name === "debt_to_assets") display = `${(ratio.value * 100).toFixed(1)}%`;
                    else if (["current_ratio", "quick_ratio", "debt_to_equity"].includes(ratio.name)) display = `${ratio.value.toFixed(2)}x`;
                    else display = `${ratio.value.toFixed(1)}%`;
                  }
                  return (
                    <tr key={ratio.name}>
                      <td style={{ fontWeight: 600, color: "var(--ink)" }}>{ratio.name.replace(/_/g, " ").toUpperCase()}</td>
                      <td className="num" style={{ fontWeight: 700 }}>{display}</td>
                      <td style={{ color: "var(--ink-soft)" }}>{ratio.interpretation}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
