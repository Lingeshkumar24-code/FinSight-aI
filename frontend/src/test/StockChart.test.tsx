import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StockChart } from "../components/market/StockChart";
import type { PricePoint, StockInfo } from "../lib/api";

const mockPoints: PricePoint[] = Array.from({ length: 60 }, (_, i) => ({
  date: `2026-10-${String((i % 30) + 1).padStart(2, "0")}`,
  open: 1350 + i * 2,
  high: 1365 + i * 2,
  low: 1340 + i * 2,
  close: 1358 + i * 2,
  volume: 3800000 + i * 10000,
}));

const mockQuote: StockInfo = {
  symbol: "RELIANCE.NS",
  name: "Reliance Industries",
  exchange: "NSE",
  currency: "INR",
  source: "live",
  data_status: "LIVE",
  as_of: "2026-11-20",
  latest_price: 1358.4,
  daily_change: -17.2,
  daily_change_pct: -1.25,
  volume: 3969546,
  trend: "bullish",
};

describe("StockChart", () => {
  it("renders stock header, price, change and volume metrics", () => {
    render(<StockChart symbol="RELIANCE.NS" quote={mockQuote} points={mockPoints} />);

    expect(screen.getByText("Reliance Industries")).toBeInTheDocument();
    expect(screen.getByText(/RELIANCE\.NS · NSE · INR/)).toBeInTheDocument();
    expect(screen.getByText(/₹1,358\.40/)).toBeInTheDocument();
    expect(screen.getByText(/-17\.20/)).toBeInTheDocument();
    expect(screen.getByText(/-1\.25%/)).toBeInTheDocument();
    expect(screen.getAllByText("VOLUME")[0]).toBeInTheDocument();
    expect(screen.getByText("DAY RANGE")).toBeInTheDocument();
    expect(screen.getByText("1Y RANGE")).toBeInTheDocument();
  });

  it("toggles between Candles and Line view modes", () => {
    render(<StockChart symbol="RELIANCE.NS" quote={mockQuote} points={mockPoints} />);

    const candlesBtn = screen.getByRole("button", { name: "Candles" });
    const lineBtn = screen.getByRole("button", { name: "Line" });

    expect(candlesBtn).toBeInTheDocument();
    expect(lineBtn).toBeInTheDocument();

    fireEvent.click(lineBtn);
    fireEvent.click(candlesBtn);
  });

  it("toggles timeframe filters and indicator overlays", () => {
    render(<StockChart symbol="RELIANCE.NS" quote={mockQuote} points={mockPoints} />);

    // Timeframes
    const tf1mo = screen.getByRole("button", { name: "1MO" });
    fireEvent.click(tf1mo);
    const tf1y = screen.getByRole("button", { name: "1Y" });
    fireEvent.click(tf1y);

    // Indicator checkboxes
    const sma20Checkbox = screen.getByRole("checkbox", { name: /sma 20/i });
    expect(sma20Checkbox).toBeChecked();
    fireEvent.click(sma20Checkbox);
    expect(sma20Checkbox).not.toBeChecked();
  });
});
