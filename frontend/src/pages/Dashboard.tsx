import { useEffect, useState } from "react";
import { api, type RatioOut, type RiskResponse, ApiError } from "../lib/api";
import { Card } from "../components/ui/Card";

// Sample figures standing in for "the business's latest submitted
// financial period" until a financial-records retrieval endpoint is wired up.
const SAMPLE_BALANCE_SHEET = {
  cash: 62000,
  accounts_receivable: 24000,
  inventory: 11000,
  other_current_assets: 4000,
  total_current_assets: 101000,
  total_assets: 280000,
  total_current_liabilities: 46000,
  total_liabilities: 98000,
  total_equity: 182000,
};

const SAMPLE_INCOME_STATEMENT = {
  revenue: 310000,
  cogs: 118000,
  operating_expenses: 94000,
  net_income: 58000,
};

// Deterministic sample cash-flow series used by the trend charts
const CASH_SERIES = [61000, 64500, 68200, 71500, 74000, 76500, 79500, 82500, 84500, 86000, 87000, 87800];

function fmtRatio(value: number | null): string {
  if (value === null) return "—";
  const rounded = Math.round(value * 1000) / 1000;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function fmtPct(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}`;
}

// Sparkline SVG
function sparklinePath(series: number[], width: number, height: number) {
  if (!series.length) {
    return { path: "", dots: [] as number[], min: 0, max: 1 };
  }
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const n = series.length;
  const step = width / (n - 1);
  const pts: number[] = [];
  let path = "";
  for (let i = 0; i < n; i++) {
    const x = i * step;
    const y = height - ((series[i] - min) / range) * (height - 4) - 2;
    pts.push(x, y);
    path += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1) + " ";
  }
  const lastX = (n - 1) * step;
  const areaPath = path + `L ${lastX.toFixed(1)} ${height} L 0 ${height} Z`;
  return { path, areaPath, dots: pts, min, max };
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
  const gradientId = `chart-grad-${Math.random().toString(36).substr(2, 9)}`;
  return (
    <svg
      className="line-chart"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Financial trend chart"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.20" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {dots.length > 0 && (
        <circle cx={dots[dots.length - 2]} cy={dots[dots.length - 1]} r="3" fill={color} stroke="#FFFFFF" strokeWidth="1.5" />
      )}
    </svg>
  );
}

export function Dashboard() {
  const [ratios, setRatios] = useState<RatioOut[] | null>(null);
  const [risk, setRisk] = useState<RiskResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const activeWatchCount = risk?.flags.filter((f) => f.level !== "low").length ?? 0;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const ratiosResp = await api.getRatios(SAMPLE_BALANCE_SHEET, SAMPLE_INCOME_STATEMENT);
        if (cancelled) return;
        setRatios(ratiosResp.ratios);

        const byName = Object.fromEntries(
          ratiosResp.ratios.map((r) => [r.name, r.value])
        );
        const riskResp = await api.getRisk({
          current_ratio: byName["current_ratio"] ?? null,
          debt_to_equity: byName["debt_to_equity"] ?? null,
          net_margin_pct: byName["net_margin_pct"] ?? null,
          cash_runway_months: 7.0,
          revenue_mom_change_pct: 2.5,
        });
        if (cancelled) return;
        setRisk(riskResp);
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err instanceof ApiError ? err.message : "Failed to load dashboard data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "48px 0", textAlign: "center" }}>
        <p style={{ color: "var(--ink-muted)", fontSize: "15px", fontWeight: 500 }}>
          Analyzing financial statements and computing ratios…
        </p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div style={{ padding: "32px 0", textAlign: "center" }}>
        <p className="error-text">{errorMsg}</p>
      </div>
    );
  }

  const byName = Object.fromEntries((ratios ?? []).map((r) => [r.name, r]));

  const insights = [
    {
      tone: "good" as const,
      head: "Profitability",
      body: (() => {
        const v = byName["net_margin_pct"]?.value;
        return v === null
          ? "Net margin not available."
          : `Net profit margin stands at ${fmtPct(v)}% — ${byName["net_margin_pct"]?.interpretation ?? "healthy earnings yield."}`;
      })(),
    },
    {
      tone: (() => {
        const v = byName["current_ratio"]?.value;
        return v === null ? "watch" : v < 1 ? "bad" : "good";
      })(),
      head: "Working Capital",
      body: (() => {
        const v = byName["current_ratio"]?.value;
        return v === null
          ? "Current ratio not available."
          : `Current ratio is ${fmtRatio(v)}x — ${byName["current_ratio"]?.interpretation ?? "sufficient liquid cover."}`;
      })(),
    },
    {
      tone: (() => {
        const v = byName["debt_to_equity"]?.value;
        return v === null ? "watch" : v > 2 ? "bad" : "good";
      })(),
      head: "Capital Structure",
      body: (() => {
        const v = byName["debt_to_equity"]?.value;
        return v === null
          ? "Debt-to-equity not available."
          : `Debt-to-equity is ${fmtRatio(v)}x — ${byName["debt_to_equity"]?.interpretation ?? "balanced leverage ratio."}`;
      })(),
    },
  ];

  const banner = insights.find((i) => i.body !== null && i.body !== "");

  const metricCards = [
    { name: "Current Ratio", fmt: fmtRatio, picker: byName["current_ratio"], series: [2.1, 2.25, 2.35, 2.28, 2.35], unit: "x" },
    { name: "Quick Ratio", fmt: fmtRatio, picker: byName["quick_ratio"], series: [1.8, 1.85, 1.95, 1.9, 1.88], unit: "x" },
    { name: "Debt / Equity", fmt: fmtRatio, picker: byName["debt_to_equity"], series: [0.65, 0.60, 0.58, 0.55, 0.54], unit: "x" },
    { name: "Gross Margin", fmt: fmtPct, picker: byName["gross_margin_pct"], series: [46.5, 47.2, 48.0, 48.9, 49.2], unit: "%" },
    { name: "Return on Equity", fmt: fmtPct, picker: byName["return_on_equity_pct"], series: [27.0, 28.5, 30.1, 31.0, 31.9], unit: "%" },
    { name: "Debt / Assets", fmt: fmtPct, picker: byName["debt_to_assets"], series: [0.38, 0.36, 0.35, 0.35, 0.35], unit: "%" },
  ];

  const cashSeries = CASH_SERIES.slice(0, 6);

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header Banner */}
      <div className="page-header">
        <div>
          <h1>Financial Performance Overview</h1>
          <p className="page-lead">
            Executive summary of liquidity, capital structure, and multi-period cash projections.
          </p>
        </div>
        <div className="health-strip">
          <div className="health-metric">
            <span className="health-label">Net Profit Margin</span>
            <span className="health-value">18.7%</span>
            <span className="health-delta">▲ +2.1%</span>
          </div>
          <div style={{ height: 24, width: 1, background: "var(--border)" }} />
          <div className="health-metric">
            <span className="health-label">Cash Runway</span>
            <span className="health-value">7.0 mos</span>
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

      {/* Strategic Insight Alert */}
      {banner && (
        <div className="insight-banner">
          <span style={{ fontSize: 18 }} aria-hidden="true">💼</span>
          <div className={`inshead is-${banner.tone}`}>
            <span><strong>{banner.head} Analysis:</strong> {banner.body}</span>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <Card>
        <div className="section-header">
          <h2>Core Financial Metrics</h2>
          <span className="section-run">Trailing 12-Month Performance</span>
        </div>
        <div className="kpi-grid">
          {metricCards.map((m) => {
            const p = m.picker;
            const deltaPct = m.series ? m.series[m.series.length - 1] - m.series[0] : 0;
            const isUp = deltaPct >= 0;
            return (
              <div className="metric" key={m.name}>
                <div className="metric-head">
                  <div className="metric-label">{m.name}</div>
                  <div className="metric-value">
                    {m.fmt(p?.value ?? null)}
                    {p?.value !== null && <span className="unit">{m.unit}</span>}
                  </div>
                  <span className={`delta ${isUp ? "is-up" : "is-down"}`}>
                    {isUp ? "▲ improving" : "▼ declining"}
                  </span>
                </div>
                <div className="metric-chart">
                  <LineChart data={m.series} color="#0A0A0A" width={110} height={38} showDots />
                </div>
                {p?.interpretation && <div className="metric-note">{p.interpretation}</div>}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Two Column Section: Cash Flow and Risk Flags */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px" }}>
        {/* Cash Flow Card */}
        {cashSeries.length > 0 && (
          <Card>
            <div className="section-header">
              <h2>Cash-Flow Outlook</h2>
              <span className="section-run">6-Month Deterministic Projection</span>
            </div>
            <div className="chart-card">
              <LineChart data={cashSeries} color="#047857" width={320} height={64} />
              <div className="chart-trend">
                <div>
                  <span style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-muted)", fontWeight: 600 }}>
                    Opening Liquidity
                  </span>
                  <strong className="num">${CASH_SERIES[0].toLocaleString()}</strong>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-muted)", fontWeight: 600 }}>
                    Projected Month 6 Cash
                  </span>
                  <strong className="num" style={{ color: "#047857" }}>
                    ${CASH_SERIES[cashSeries.length - 1].toLocaleString()}
                  </strong>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Risk Items Card */}
        {risk && (
          <Card>
            <div className="section-header">
              <h2>Risk Management & Governance</h2>
              <span className="section-run">Automated Compliance Screen</span>
            </div>
            <div className="mt-2">
              {risk.flags.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {risk.flags.map((flag) => (
                    <div
                      key={flag.code}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 12px",
                        background: "var(--surface-raised)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-soft)",
                      }}
                    >
                      <span className={`pill is-${flag.level}`}>{flag.level}</span>
                      <span style={{ fontSize: "13px", color: "var(--ink-soft)" }}>{flag.message}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3 text-sm" style={{ padding: "16px 0" }}>
                  <span className="pill is-good">All Clear</span>
                  <span style={{ color: "var(--ink-soft)" }}>No critical liquidity or debt breach thresholds detected.</span>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Solvency and Ratio Table */}
      {ratios && ratios.length > 0 && (
        <Card>
          <div className="section-header">
            <h2>Detailed Financial Ratios Ledger</h2>
            <span className="section-run">Standard Solvency, Efficiency & Profitability Benchmarks</span>
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
                {ratios.map((r) => {
                  let disp: string;
                  if (r.value === null) {
                    disp = "—";
                  } else if (r.name === "debt_to_assets") {
                    disp = `${(r.value * 100).toFixed(1)}%`;
                  } else if (r.name === "current_ratio" || r.name === "quick_ratio" || r.name === "debt_to_equity") {
                    disp = `${r.value.toFixed(2)}x`;
                  } else {
                    disp = `${r.value.toFixed(1)}%`;
                  }
                  return (
                    <tr key={r.name}>
                      <td style={{ fontWeight: 600, color: "var(--ink)" }}>{r.name.replace(/_/g, " ").toUpperCase()}</td>
                      <td className="num" style={{ fontWeight: 700 }}>{disp}</td>
                      <td style={{ color: "var(--ink-soft)" }}>{r.interpretation}</td>
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
