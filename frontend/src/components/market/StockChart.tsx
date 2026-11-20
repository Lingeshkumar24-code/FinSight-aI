import { useMemo, useState } from "react";
import type { PricePoint, StockInfo } from "../../lib/api";

const COMPANY_NAMES: Record<string, string> = {
  "RELIANCE.NS": "Reliance Industries",
  "RELIANCE.BO": "Reliance Industries",
  "TCS.NS": "Tata Consultancy Services",
  "TCS.BO": "Tata Consultancy Services",
  "INFY.NS": "Infosys Limited",
  "INFY.BO": "Infosys Limited",
  "HDFCBANK.NS": "HDFC Bank Limited",
  "HDFCBANK.BO": "HDFC Bank Limited",
  "SBIN.NS": "State Bank of India",
  "SBIN.BO": "State Bank of India",
  "WIPRO.NS": "Wipro Limited",
  "ADANIENT.NS": "Adani Enterprises",
  "BAJFINANCE.NS": "Bajaj Finance Limited",
  "SPY": "SPDR S&P 500 ETF Trust",
  "QQQ": "Invesco QQQ Trust",
  "TLT": "iShares 20+ Year Treasury Bond ETF",
  "GLD": "SPDR Gold Shares",
  "BTC/USD": "Bitcoin / US Dollar",
};

export type Timeframe = "1MO" | "3MO" | "6MO" | "1Y" | "2Y" | "5Y";
export type ChartType = "candles" | "line";

interface StockChartProps {
  symbol: string;
  quote: StockInfo | null;
  points: PricePoint[];
  currencySymbol?: string;
}

// ── Technical indicator helpers ─────────────────────────────────────────────
function calculateSMA(data: PricePoint[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close;
      }
      result.push(sum / period);
    }
  }
  return result;
}

function calculateEMA(data: PricePoint[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prevEma: number | null = null;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[j].close;
      }
      prevEma = sum / period;
      result.push(prevEma);
    } else {
      const currentEma: number = data[i].close * k + (prevEma as number) * (1 - k);
      result.push(currentEma);
      prevEma = currentEma;
    }
  }
  return result;
}

function formatINR(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "—";
  return `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatVol(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "—";
  return Math.round(val).toLocaleString("en-IN");
}

export function StockChart({ symbol, quote, points }: StockChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("1Y");
  const [chartType, setChartType] = useState<ChartType>("candles");
  const [showSMA20, setShowSMA20] = useState(true);
  const [showSMA50, setShowSMA50] = useState(true);
  const [showEMA12, setShowEMA12] = useState(false);
  const [showEMA26, setShowEMA26] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Filter points based on selected timeframe
  const filteredPoints = useMemo(() => {
    if (!points || points.length === 0) return [];
    const countMap: Record<Timeframe, number> = {
      "1MO": 22,
      "3MO": 65,
      "6MO": 130,
      "1Y": 252,
      "2Y": 504,
      "5Y": points.length,
    };
    const count = countMap[timeframe] || 252;
    return points.slice(-count);
  }, [points, timeframe]);

  // Indicator series
  const sma20 = useMemo(() => calculateSMA(filteredPoints, 20), [filteredPoints]);
  const sma50 = useMemo(() => calculateSMA(filteredPoints, 50), [filteredPoints]);
  const ema12 = useMemo(() => calculateEMA(filteredPoints, 12), [filteredPoints]);
  const ema26 = useMemo(() => calculateEMA(filteredPoints, 26), [filteredPoints]);

  // Current stats
  const latestPoint = filteredPoints[filteredPoints.length - 1];
  const prevPoint = filteredPoints[filteredPoints.length - 2];

  const currentPrice = quote?.latest_price ?? latestPoint?.close ?? 0;
  const priceChange = quote?.daily_change ?? (latestPoint && prevPoint ? latestPoint.close - prevPoint.close : 0);
  const changePct = quote?.daily_change_pct ?? (prevPoint && prevPoint.close ? (priceChange / prevPoint.close) * 100 : 0);
  const isUp = priceChange >= 0;

  const currentVolume = latestPoint?.volume ?? quote?.volume ?? 0;
  const dayLow = latestPoint?.low ?? currentPrice * 0.98;
  const dayHigh = latestPoint?.high ?? currentPrice * 1.02;

  // 1Y Range from all available 1Y points
  const oneYearPoints = useMemo(() => points.slice(-252), [points]);
  const yearLow = oneYearPoints.length > 0 ? Math.min(...oneYearPoints.map((p) => p.low)) : dayLow;
  const yearHigh = oneYearPoints.length > 0 ? Math.max(...oneYearPoints.map((p) => p.high)) : dayHigh;

  const companyName = COMPANY_NAMES[symbol] || quote?.name || symbol;
  const exchangeName = symbol.endsWith(".BO") ? "BSE" : "NSE";

  // Hovered or latest active data
  const activeIdx = hoverIdx !== null && hoverIdx >= 0 && hoverIdx < filteredPoints.length ? hoverIdx : filteredPoints.length - 1;
  const activePoint = filteredPoints[activeIdx] || latestPoint;

  // Chart dimensions
  const svgWidth = 840;
  const totalHeight = 440;
  const margin = { top: 20, right: 75, bottom: 25, left: 15 };
  const chartWidth = svgWidth - margin.left - margin.right;
  const priceHeight = 300;
  const volumeGap = 15;
  const volumeHeight = 70;
  const volumeTop = margin.top + priceHeight + volumeGap;

  // Scales
  const { minPrice, maxPrice, maxVolume } = useMemo(() => {
    if (filteredPoints.length === 0) return { minPrice: 0, maxPrice: 100, maxVolume: 100 };
    let minP = Math.min(...filteredPoints.map((p) => p.low));
    let maxP = Math.max(...filteredPoints.map((p) => p.high));
    const pad = (maxP - minP) * 0.05 || 10;
    minP = Math.max(0, minP - pad);
    maxP = maxP + pad;
    const maxV = Math.max(...filteredPoints.map((p) => p.volume)) || 1;
    return { minPrice: minP, maxPrice: maxP, maxVolume: maxV };
  }, [filteredPoints]);

  const n = filteredPoints.length;
  const barWidth = n > 0 ? Math.max(2, Math.min(18, (chartWidth / n) * 0.72)) : 6;
  const step = n > 1 ? chartWidth / (n - 1) : chartWidth;

  const getX = (idx: number) => margin.left + idx * step;
  const getY = (price: number) => margin.top + (1 - (price - minPrice) / (maxPrice - minPrice || 1)) * priceHeight;
  const getVolY = (vol: number) => volumeTop + (1 - vol / maxVolume) * volumeHeight;

  // Build line paths for moving averages
  const buildLinePath = (series: (number | null)[]) => {
    let d = "";
    for (let i = 0; i < series.length; i++) {
      const val = series[i];
      if (val !== null && val !== undefined) {
        const x = getX(i);
        const y = getY(val);
        d += d === "" ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
    }
    return d;
  };

  const sma20Path = useMemo(() => (showSMA20 ? buildLinePath(sma20) : ""), [showSMA20, sma20, minPrice, maxPrice]);
  const sma50Path = useMemo(() => (showSMA50 ? buildLinePath(sma50) : ""), [showSMA50, sma50, minPrice, maxPrice]);
  const ema12Path = useMemo(() => (showEMA12 ? buildLinePath(ema12) : ""), [showEMA12, ema12, minPrice, maxPrice]);
  const ema26Path = useMemo(() => (showEMA26 ? buildLinePath(ema26) : ""), [showEMA26, ema26, minPrice, maxPrice]);

  // Close price line path for line mode
  const closeLinePath = useMemo(() => {
    if (filteredPoints.length === 0) return "";
    return filteredPoints
      .map((p, i) => `${i === 0 ? "M" : "L"} ${getX(i).toFixed(1)} ${getY(p.close).toFixed(1)}`)
      .join(" ");
  }, [filteredPoints, minPrice, maxPrice]);

  const closeAreaPath = useMemo(() => {
    if (!closeLinePath || filteredPoints.length === 0) return "";
    const firstX = getX(0);
    const lastX = getX(filteredPoints.length - 1);
    const baseY = margin.top + priceHeight;
    return `${closeLinePath} L ${lastX.toFixed(1)} ${baseY} L ${firstX.toFixed(1)} ${baseY} Z`;
  }, [closeLinePath, filteredPoints]);

  // Price axis ticks
  const priceTicks = useMemo(() => {
    const ticks: number[] = [];
    const count = 5;
    const stepVal = (maxPrice - minPrice) / (count - 1);
    for (let i = 0; i < count; i++) {
      ticks.push(minPrice + i * stepVal);
    }
    return ticks;
  }, [minPrice, maxPrice]);

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 12,
        border: "1px solid #E2E8F0",
        padding: "24px 24px 20px 24px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* ── Top Header Section ────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#0F172A", letterSpacing: "-0.02em" }}>
            {companyName}
          </h2>
          <div style={{ fontSize: 13, color: "#64748B", marginTop: 4, fontWeight: 500 }}>
            {symbol} · {exchangeName} · INR
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em" }}>
            {formatINR(currentPrice)}
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: isUp ? "#16A34A" : "#DC2626",
              marginTop: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 4,
            }}
          >
            <span>{isUp ? "+" : ""}{priceChange.toFixed(2)}</span>
            <span>({isUp ? "+" : ""}{changePct.toFixed(2)}%)</span>
          </div>
          <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
            Latest available close · {latestPoint?.date || new Date().toISOString().slice(0, 10)}
          </div>
        </div>
      </div>

      {/* ── Stat Summary Row (Volume, Day Range, 1Y Range) ───────────── */}
      <div
        style={{
          display: "flex",
          gap: 36,
          padding: "12px 0 16px 0",
          borderTop: "1px solid #F1F5F9",
          borderBottom: "1px solid #F1F5F9",
          marginBottom: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            VOLUME
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginTop: 2 }}>
            {formatVol(currentVolume)}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            DAY RANGE
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginTop: 2 }}>
            {formatINR(dayLow)} — {formatINR(dayHigh)}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            1Y RANGE
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginTop: 2 }}>
            {formatINR(yearLow)} — {formatINR(yearHigh)}
          </div>
        </div>
      </div>

      {/* ── Controls Toolbar (Timeframe, Chart Type, Indicator Checkboxes) */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          marginBottom: 16,
        }}
      >
        {/* Left: Timeframe pills & Chart Type */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Timeframe pills */}
          <div style={{ display: "inline-flex", background: "#F1F5F9", borderRadius: 8, padding: 3, gap: 2 }}>
            {(["1MO", "3MO", "6MO", "1Y", "2Y", "5Y"] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                style={{
                  border: "none",
                  outline: "none",
                  cursor: "pointer",
                  padding: "5px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 6,
                  transition: "all 0.15s ease",
                  background: timeframe === tf ? "#FFFFFF" : "transparent",
                  color: timeframe === tf ? "#0F172A" : "#64748B",
                  boxShadow: timeframe === tf ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Chart Type segmented control */}
          <div style={{ display: "inline-flex", background: "#F1F5F9", borderRadius: 8, padding: 3, gap: 2 }}>
            <button
              type="button"
              onClick={() => setChartType("candles")}
              style={{
                border: "none",
                outline: "none",
                cursor: "pointer",
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                transition: "all 0.15s ease",
                background: chartType === "candles" ? "#FFFFFF" : "transparent",
                color: chartType === "candles" ? "#0F172A" : "#64748B",
                boxShadow: chartType === "candles" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              Candles
            </button>
            <button
              type="button"
              onClick={() => setChartType("line")}
              style={{
                border: "none",
                outline: "none",
                cursor: "pointer",
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                transition: "all 0.15s ease",
                background: chartType === "line" ? "#FFFFFF" : "transparent",
                color: chartType === "line" ? "#0F172A" : "#64748B",
                boxShadow: chartType === "line" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              Line
            </button>
          </div>
        </div>

        {/* Right: Technical Overlays checkboxes */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#2563EB", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={showSMA20}
              onChange={(e) => setShowSMA20(e.target.checked)}
              style={{ accentColor: "#2563EB", cursor: "pointer" }}
            />
            SMA 20
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#F59E0B", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={showSMA50}
              onChange={(e) => setShowSMA50(e.target.checked)}
              style={{ accentColor: "#F59E0B", cursor: "pointer" }}
            />
            SMA 50
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#10B981", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={showEMA12}
              onChange={(e) => setShowEMA12(e.target.checked)}
              style={{ accentColor: "#10B981", cursor: "pointer" }}
            />
            EMA 12
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#8B5CF6", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={showEMA26}
              onChange={(e) => setShowEMA26(e.target.checked)}
              style={{ accentColor: "#8B5CF6", cursor: "pointer" }}
            />
            EMA 26
          </label>
        </div>
      </div>

      {/* ── Active Bar Hover Stats Bar ───────────────────────────────── */}
      {activePoint && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 12,
            color: "#475569",
            background: "#F8FAFC",
            padding: "6px 12px",
            borderRadius: 6,
            marginBottom: 10,
          }}
        >
          <span><strong>Date:</strong> {activePoint.date}</span>
          <span><strong>O:</strong> {activePoint.open.toFixed(2)}</span>
          <span><strong>H:</strong> {activePoint.high.toFixed(2)}</span>
          <span><strong>L:</strong> {activePoint.low.toFixed(2)}</span>
          <span><strong>C:</strong> {activePoint.close.toFixed(2)}</span>
          <span><strong>Vol:</strong> {formatVol(activePoint.volume)}</span>
          {showSMA20 && sma20[activeIdx] && (
            <span style={{ color: "#2563EB" }}><strong>SMA20:</strong> {sma20[activeIdx]?.toFixed(2)}</span>
          )}
          {showSMA50 && sma50[activeIdx] && (
            <span style={{ color: "#F59E0B" }}><strong>SMA50:</strong> {sma50[activeIdx]?.toFixed(2)}</span>
          )}
        </div>
      )}

      {/* ── SVG Main Chart (Candlestick & Line + Moving Averages + Volume) */}
      <div style={{ position: "relative", width: "100%", overflowX: "hidden" }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${totalHeight}`}
          style={{ width: "100%", height: "auto", display: "block" }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = ((e.clientX - rect.left) / rect.width) * svgWidth - margin.left;
            const idx = Math.round(relX / step);
            if (idx >= 0 && idx < filteredPoints.length) {
              setHoverIdx(idx);
            }
          }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Price Gridlines and Y-axis Labels */}
          {priceTicks.map((tick, i) => {
            const y = getY(tick);
            return (
              <g key={i}>
                <line
                  x1={margin.left}
                  y1={y}
                  x2={margin.left + chartWidth}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={margin.left + chartWidth + 10}
                  y={y + 4}
                  fill="#94A3B8"
                  fontSize="11"
                  fontFamily="system-ui"
                  textAnchor="start"
                >
                  {Math.round(tick)}
                </text>
              </g>
            );
          })}

          {/* ── Line Chart Mode ──────────────────────────────────────── */}
          {chartType === "line" && closeLinePath && (
            <>
              <path d={closeAreaPath} fill="url(#chartGradient)" />
              <path d={closeLinePath} fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
            </>
          )}

          {/* ── Candlestick Chart Mode ──────────────────────────────── */}
          {chartType === "candles" &&
            filteredPoints.map((p, i) => {
              const x = getX(i);
              const isBull = p.close >= p.open;
              const color = isBull ? "#16A34A" : "#DC2626";
              const openY = getY(p.open);
              const closeY = getY(p.close);
              const highY = getY(p.high);
              const lowY = getY(p.low);

              const bodyTop = Math.min(openY, closeY);
              const bodyHeight = Math.max(2, Math.abs(closeY - openY));

              return (
                <g key={i}>
                  {/* Upper and lower wick line */}
                  <line
                    x1={x}
                    y1={highY}
                    x2={x}
                    y2={lowY}
                    stroke={color}
                    strokeWidth="1.2"
                  />
                  {/* Candle Body */}
                  <rect
                    x={x - barWidth / 2}
                    y={bodyTop}
                    width={barWidth}
                    height={bodyHeight}
                    fill={color}
                    stroke={color}
                    strokeWidth="0.5"
                    rx="1"
                  />
                </g>
              );
            })}

          {/* ── Overlay Moving Averages ──────────────────────────────── */}
          {showSMA20 && sma20Path && (
            <path d={sma20Path} fill="none" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" />
          )}
          {showSMA50 && sma50Path && (
            <path d={sma50Path} fill="none" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" />
          )}
          {showEMA12 && ema12Path && (
            <path d={ema12Path} fill="none" stroke="#10B981" strokeWidth="1.6" strokeLinecap="round" />
          )}
          {showEMA26 && ema26Path && (
            <path d={ema26Path} fill="none" stroke="#8B5CF6" strokeWidth="1.6" strokeLinecap="round" />
          )}

          {/* ── Volume Sub-Pane ───────────────────────────────────────── */}
          <text
            x={margin.left}
            y={volumeTop - 4}
            fill="#64748B"
            fontSize="10"
            fontWeight="700"
            letterSpacing="0.05em"
          >
            VOLUME
          </text>
          <line
            x1={margin.left}
            y1={volumeTop}
            x2={margin.left + chartWidth}
            y2={volumeTop}
            stroke="#E2E8F0"
            strokeWidth="1"
          />

          {filteredPoints.map((p, i) => {
            const x = getX(i);
            const isBull = p.close >= p.open;
            const color = isBull ? "#86EFAC" : "#FCA5A5";
            const vY = getVolY(p.volume);
            const vHeight = Math.max(1, volumeTop + volumeHeight - vY);

            return (
              <rect
                key={`v-${i}`}
                x={x - barWidth / 2}
                y={vY}
                width={barWidth}
                height={vHeight}
                fill={color}
                opacity={0.85}
              />
            );
          })}

          {/* ── Hover Crosshair ───────────────────────────────────────── */}
          {hoverIdx !== null && hoverIdx >= 0 && hoverIdx < filteredPoints.length && (
            <g>
              <line
                x1={getX(hoverIdx)}
                y1={margin.top}
                x2={getX(hoverIdx)}
                y2={volumeTop + volumeHeight}
                stroke="#64748B"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <circle
                cx={getX(hoverIdx)}
                y={getY(filteredPoints[hoverIdx].close)}
                r="4"
                fill="#0F172A"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
