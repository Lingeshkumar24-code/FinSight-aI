import { useEffect, useState } from "react";
import { AICFOAvatar } from "../ai/AICFOAvatar";

interface TourStep {
  step: number;
  icon: string;
  badge: string;
  title: string;
  summary: string;
  details: string[];
  sampleOutput: string;
  linkText: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    step: 1,
    icon: "📊",
    badge: "EXECUTIVE DASHBOARD",
    title: "Financial Performance & Liquidity Overview",
    summary:
      "Your high-level command center showing live solvency ratios, profitability margins, cash runway, and risk items.",
    details: [
      "Real-time Core Metrics: Net Margin (18.7%), Gross Margin (61.9%), and Current Ratio (2.20x).",
      "Cash-Flow Outlook: Projected opening, closing, and burn-rate liquidity balances.",
      "Multi-Period Ledger: Detailed financial ratios with industry benchmark comparison.",
    ],
    sampleOutput: "Optimal Liquidity · 0 Covenant Breaches · 1.5 Months Runway",
    linkText: "View Dashboard (/)",
  },
  {
    step: 2,
    icon: "📂",
    badge: "DOCUMENT INGESTION & AGENTIC RAG",
    title: "20+ Sheet Excel & Multi-Format Document Ingestion",
    summary:
      "Upload complex 22-sheet financial workbooks, bank statements, or invoices with instant section-aware chunking.",
    details: [
      "Ultra-Fast Parsing: Parses 735,000+ characters across 22 sheets in under 3.5 seconds.",
      "100% Citation Tracking: Tracks exact sheet names (Annual P&L, Balance Sheet, Loan Register, Cash Flow).",
      "Noise Filtering: Automatically removes template instructions to extract only verified transaction figures.",
    ],
    sampleOutput: "1,151 chunks indexed · 100% sheet source accuracy",
    linkText: "Upload Documents (/upload)",
  },
  {
    step: 3,
    icon: "🧠",
    badge: "AUTONOMOUS CFO ADVISOR",
    title: "Agentic RAG Debt & Surplus Capital Advisory",
    summary:
      "Ask plain-language financial questions and receive deterministic CFO decisions with grounded calculations.",
    details: [
      "Loan Decision: Analyzes debt service (₹1.26L/mo EMI across 3 loans) and decisively advises whether to borrow.",
      "Stock Investment: Evaluates cash buffer (₹23.5L) against monthly OpEx to guide safe capital allocation.",
      "Verified Citations: Every single recommendation links back to source sheet rows and chunk indices.",
    ],
    sampleOutput: "Decision: DO NOT TAKE ADDITIONAL LOAN · Prioritize collecting ₹6,61,953 in receivables",
    linkText: "Ask AI Advisor (/advisor)",
  },
  {
    step: 4,
    icon: "🎛️",
    badge: "WHAT-IF SIMULATOR",
    title: "Causal Financial Simulation Engine",
    summary:
      "Stress-test your business strategy before committing capital. Adjust operational levers and see 12-month projections.",
    details: [
      "Dynamic Levers: Revenue growth (+10%), COGS reduction (-5%), OpEx changes, and new loan financing.",
      "Cash Trajectory: Month-by-month forecasting of cash reserves, operating burn, and break-even periods.",
      "Instant Feasibility: Flags potential insolvency or covenant breach months in advance.",
    ],
    sampleOutput: "+10% Revenue Growth projects ₹38.4L ending cash with +₹14.2L profit expansion",
    linkText: "Run Simulation (/simulator)",
  },
  {
    step: 5,
    icon: "📈",
    badge: "MARKET INTELLIGENCE & TRADING",
    title: "Real-Time Candlestick Charts & Technical Analysis",
    summary:
      "Monitor Indian equities (NSE/BSE) with professional candlestick charts, technical overlays, and virtual paper trading.",
    details: [
      "Professional Charting: Candlestick/Line modes with timeframes from 1MO to 5Y.",
      "Technical Overlays: Real-time SMA 20, SMA 50, EMA 12, EMA 26, RSI (14), and MACD signal indicators.",
      "Risk-Free Paper Trading: Execute virtual buy/sell orders and manage simulated business treasury portfolios.",
    ],
    sampleOutput: "Reliance Industries (₹1,358.40) · SMA 20/50 Overlays · Volume Subplot",
    linkText: "Market Intelligence (/market)",
  },
  {
    step: 6,
    icon: "🛡️",
    badge: "FRAUD DETECTION & AUTOMATIONS",
    title: "Forensic Audit & Automated Background Alerts",
    summary:
      "Continuous enterprise protection with Benford's Law anomaly detection and scheduled webhook monitors.",
    details: [
      "Forensic Scanning: First-digit distribution analysis detecting manipulated invoices and suspicious transactions.",
      "Duplicate & Split Payments: Automatically detects invoice splitting designed to bypass approval thresholds.",
      "2-Minute Daemon Monitor: Periodic background cron scans dispatching real-time webhooks for critical risks.",
    ],
    sampleOutput: "0 Critical Fraud Flags · Benford Deviation < 1.8% · n8n Webhook Active",
    linkText: "Fraud Detection (/fraud)",
  },
];

interface OnboardingModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export function OnboardingModal({ forceOpen = false, onClose }: OnboardingModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(true);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      setCurrentStepIndex(0);
      return;
    }
    const hasSeenTour = localStorage.getItem("finsight_tour_completed");
    if (!hasSeenTour) {
      // Show automatically on first sign in after a brief delay
      const timer = setTimeout(() => setIsOpen(true), 600);
      return () => clearTimeout(timer);
    }
  }, [forceOpen]);

  // Listen for custom trigger event
  useEffect(() => {
    function handleOpenEvent() {
      setIsOpen(true);
      setCurrentStepIndex(0);
    }
    window.addEventListener("finsight-open-tour", handleOpenEvent);
    return () => window.removeEventListener("finsight-open-tour", handleOpenEvent);
  }, []);

  function handleClose() {
    if (dontShowAgain) {
      localStorage.setItem("finsight_tour_completed", "true");
    }
    setIsOpen(false);
    if (onClose) onClose();
  }

  function handleNext() {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleClose();
    }
  }

  function handleBack() {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }

  if (!isOpen) return null;

  const currentStep = TOUR_STEPS[currentStepIndex];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        padding: "20px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 680,
          background: "#FFFFFF",
          borderRadius: 20,
          border: "1px solid #E2E8F0",
          boxShadow: "0 25px 60px -15px rgba(15, 23, 42, 0.35)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          animation: "modalFadeIn 0.22s ease-out",
        }}
      >
        {/* ── Top Header with Robot & Progress ──────────────────────── */}
        <div
          style={{
            background: "linear-gradient(135deg, #090B1E 0%, #171544 100%)",
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#FFFFFF",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <AICFOAvatar size={48} expression="happy" compact />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#38BDF8", letterSpacing: "0.08em" }}>
                FINSIGHT AI · WELCOME TOUR
              </div>
              <h3 style={{ margin: "2px 0 0", fontSize: 17, fontWeight: 700, color: "#FFFFFF" }}>
                Step {currentStep.step} of {TOUR_STEPS.length}: {currentStep.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close Tour"
            style={{
              background: "rgba(255, 255, 255, 0.12)",
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              color: "#FFFFFF",
              fontSize: 18,
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
              transition: "background 0.15s",
            }}
          >
            ×
          </button>
        </div>

        {/* ── Step Progress Indicator Bar ──────────────────────────── */}
        <div style={{ display: "flex", height: 4, background: "#F1F5F9" }}>
          {TOUR_STEPS.map((step, idx) => (
            <div
              key={step.step}
              style={{
                flex: 1,
                background: idx <= currentStepIndex ? "#2563EB" : "transparent",
                transition: "background 0.25s ease",
              }}
            />
          ))}
        </div>

        {/* ── Step Body Content ────────────────────────────────────── */}
        <div style={{ padding: "28px 32px 20px 32px", overflowY: "auto", maxHeight: "65vh" }}>
          {/* Badge & Step Title */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 26 }}>{currentStep.icon}</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#2563EB",
                background: "#EFF6FF",
                padding: "3px 10px",
                borderRadius: 9999,
                letterSpacing: "0.05em",
              }}
            >
              {currentStep.badge}
            </span>
          </div>

          <p style={{ fontSize: 15, color: "#1E293B", fontWeight: 500, lineHeight: 1.5, margin: "0 0 16px" }}>
            {currentStep.summary}
          </p>

          {/* Details list */}
          <div
            style={{
              background: "#F8FAFC",
              borderRadius: 12,
              padding: "16px 20px",
              border: "1px solid #E2E8F0",
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: 8, letterSpacing: "0.05em" }}>
              Key Capabilities:
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>
              {currentStep.details.map((detail, i) => (
                <li key={i} style={{ fontSize: 13.5, color: "#334155", lineHeight: 1.4 }}>
                  {detail}
                </li>
              ))}
            </ul>
          </div>

          {/* Live Output Highlight Box */}
          <div
            style={{
              background: "#F0FDF4",
              border: "1px solid #BBF7D0",
              borderRadius: 10,
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 16 }}>⚡</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#166534" }}>
              {currentStep.sampleOutput}
            </span>
          </div>
        </div>

        {/* ── Footer Controls ──────────────────────────────────────── */}
        <div
          style={{
            padding: "16px 32px 20px 32px",
            borderTop: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#FAFAFA",
          }}
        >
          {/* Don't show again toggle */}
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#64748B", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              style={{ accentColor: "#2563EB", cursor: "pointer" }}
            />
            Don't show this tour automatically again
          </label>

          {/* Navigation Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={handleBack}
                style={{
                  background: "transparent",
                  border: "1px solid #CBD5E1",
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#475569",
                  cursor: "pointer",
                }}
              >
                ← Back
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              style={{
                background: "transparent",
                border: "none",
                fontSize: 13,
                fontWeight: 600,
                color: "#64748B",
                cursor: "pointer",
                padding: "8px 12px",
              }}
            >
              Skip
            </button>

            <button
              type="button"
              onClick={handleNext}
              style={{
                background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
                border: "none",
                borderRadius: 8,
                padding: "8px 20px",
                fontSize: 13,
                fontWeight: 600,
                color: "#FFFFFF",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(37, 99, 235, 0.3)",
              }}
            >
              {currentStepIndex === TOUR_STEPS.length - 1 ? "Get Started 🚀" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Global helper to trigger the tour popup from anywhere (e.g. Topbar button)
export function openProductTour() {
  window.dispatchEvent(new CustomEvent("finsight-open-tour"));
}
