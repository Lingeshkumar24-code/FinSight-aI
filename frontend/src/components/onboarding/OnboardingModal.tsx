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
    badge: "BUSINESS COMMAND CENTER",
    title: "Financial Health & Cash Runway Overview",
    summary:
      "Your executive dashboard showing profit margins, cash in the bank, bill payment safety, and active loan balances in plain English.",
    details: [
      "Real-Time Profitability: 18.7% net profit margin — you keep 18.7 paise of profit for every ₹1 of revenue earned.",
      "Cash Cushion: ₹23,50,000 in liquid bank reserves gives you 1.5 months of safe operating runway.",
      "Bill Safety: 2.196x liquidity ratio means ₹2.20 in liquid assets for every ₹1 of upcoming bills.",
    ],
    sampleOutput: "Optimal Liquidity · Zero Missed Loan Payments · 1.5 Months Cash Cushion",
    linkText: "View Dashboard (/)",
  },
  {
    step: 2,
    icon: "📂",
    badge: "SPREADSHEET & DOCUMENT READER",
    title: "Upload Messy Excel Spreadsheets & Invoices",
    summary:
      "Upload your multi-sheet Excel workbooks, invoices, or bank records. FinSight reads everything in 3 seconds without complicated formulas.",
    details: [
      "Instant Reading: Reads 22 sheets and 735,000+ characters across complex workbooks in under 3.5 seconds.",
      "100% Verified Citations: Every single calculation points directly back to the exact sheet name and row in your file.",
      "Cleans the Noise: Automatically ignores blank cells and template text to focus only on real financial figures.",
    ],
    sampleOutput: "1,151 data chunks read · 100% sheet source accuracy",
    linkText: "Upload Documents (/upload)",
  },
  {
    step: 3,
    icon: "🧠",
    badge: "YOUR 24/7 AI CFO",
    title: "Ask Plain-English Questions & Get Confident Decisions",
    summary:
      "Ask questions like 'Can we afford to borrow ₹10L?' or 'Can we hire 3 employees?'. FinSight calculates your exact loan EMIs and debt limits.",
    details: [
      "Clear Borrowing Advice: Evaluates existing loans (₹1.26L/mo EMI across 3 loans) to tell you if borrowing is safe.",
      "Cash Buffer Protection: Tells you how much money to keep untouched before spending on new inventory or tools.",
      "Actionable Priority: Recommends collecting ₹6,61,953 in overdue customer receivables before taking any new debt.",
    ],
    sampleOutput: "Decision: DO NOT TAKE NEW LOAN · Collect ₹6,61,953 in customer bills first",
    linkText: "Ask AI Advisor (/advisor)",
  },
  {
    step: 4,
    icon: "🎛️",
    badge: "SCENARIO SLIDERS",
    title: "Test Business Decisions Before Spending Real Money",
    summary:
      "Move simple sliders to see what happens to your cash balance over the next 12 months before hiring staff or signing contracts.",
    details: [
      "Intuitive What-If Sliders: Test +10% sales growth, -5% supplier discounts, or taking on a new commercial loan.",
      "Month-by-Month Forecast: Visual chart showing projected cash in the bank, monthly burn rate, and break-even points.",
      "Early Warnings: Flags if a decision will cause cash to run low months in advance.",
    ],
    sampleOutput: "+10% Sales Growth projects ₹38.4L in the bank with +₹14.2L profit expansion",
    linkText: "Run Simulation (/simulator)",
  },
  {
    step: 5,
    icon: "📈",
    badge: "STOCK TRENDS & IDLE CASH",
    title: "Track Stocks & Grow Surplus Business Cash Safely",
    summary:
      "Don't let extra company cash sit idle. Follow live NSE/BSE stocks with clear trends, and practice virtual paper trading with zero risk.",
    details: [
      "Live Candlestick Charts: View Reliance, Tata Motors, Infosys and NSE blue-chips with clean trendlines.",
      "Moving Averages: 20-day and 50-day indicators show whether a stock is gaining or losing momentum.",
      "Risk-Free Paper Trading: Practice virtual buy and sell orders with zero real money at risk.",
    ],
    sampleOutput: "Reliance Industries (₹1,358.40) · Moving Average Trendlines · Volume Bar Active",
    linkText: "Market Intelligence (/market)",
  },
  {
    step: 6,
    icon: "🛡️",
    badge: "FRAUD & BILLING WATCHDOG",
    title: "Automatic Fraud Shield & 24/7 Cash Alerts",
    summary:
      "Protects your bank balance from duplicate vendor bills, abnormal invoice amounts, and cash crunch surprises.",
    details: [
      "Duplicate Bill Catch: Flags vendors who submit the same invoice twice or split bills into smaller amounts.",
      "Forensic Number Watchdog: Spots manipulated numbers and suspicious transaction patterns automatically.",
      "24/7 Alerts: Sends instant alerts if your cash cushion drops below safe levels.",
    ],
    sampleOutput: "Zero Fraud Flags · Invoice Verification Complete · 24/7 Monitor Active",
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

  // Listen to custom window event to trigger tour from Topbar or anywhere
  useEffect(() => {
    const handleOpenTour = () => {
      setIsOpen(true);
      setCurrentStepIndex(0);
    };
    window.addEventListener("finsight:open-tour", handleOpenTour);
    return () => window.removeEventListener("finsight:open-tour", handleOpenTour);
  }, []);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem("finsight_tour_completed", "true");
    }
    setIsOpen(false);
    onClose?.();
  };

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleClose();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  if (!isOpen) return null;

  const currentStep = TOUR_STEPS[currentStepIndex];

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        background: "rgba(18, 18, 19, 0.65)", // Dark obsidian backdrop
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        animation: "fadeIn 0.2s ease-out",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 20,
          boxShadow: "0 25px 60px -15px rgba(20, 19, 18, 0.4)",
          width: "100%",
          maxWidth: 680,
          overflow: "hidden",
          border: "1px solid #E7E1D7",
          animation: "scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* ── Top Header with Robot & Progress (Cream & Black Luxury) ─── */}
        <div
          style={{
            background: "#18181B", // Deep obsidian black
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#FAF7F2",
            borderBottom: "1px solid #27272A",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <AICFOAvatar size={46} expression="happy" compact />
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#D4AF37", // Warm champagne gold
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                FINSIGHT AI · WELCOME TOUR
              </div>
              <h3 style={{ margin: "2px 0 0", fontSize: 16.5, fontWeight: 700, color: "#FFFFFF" }}>
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
              color: "#FAF7F2",
              fontSize: 18,
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
            }}
          >
            ×
          </button>
        </div>

        {/* ── Step Progress Indicator Bar ──────────────────────────── */}
        <div style={{ display: "flex", height: 4, background: "#F5EFE6" }}>
          {TOUR_STEPS.map((step, idx) => (
            <div
              key={step.step}
              style={{
                flex: 1,
                background: idx <= currentStepIndex ? "#18181B" : "transparent",
                transition: "background 0.25s ease",
              }}
            />
          ))}
        </div>

        {/* ── Step Body Content ────────────────────────────────────── */}
        <div style={{ padding: "26px 30px 18px", overflowY: "auto", maxHeight: "65vh" }}>
          {/* Badge & Step Title */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 26 }}>{currentStep.icon}</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#44403C",
                background: "#F5EFE6",
                border: "1px solid #DFD5C6",
                padding: "3px 10px",
                borderRadius: 9999,
                letterSpacing: "0.05em",
              }}
            >
              {currentStep.badge}
            </span>
          </div>

          <p
            style={{
              fontSize: 15,
              color: "#1C1917",
              fontWeight: 500,
              lineHeight: 1.55,
              margin: "0 0 16px",
            }}
          >
            {currentStep.summary}
          </p>

          {/* Details list */}
          <div
            style={{
              background: "#FAF7F2",
              borderRadius: 12,
              padding: "16px 20px",
              border: "1px solid #E7E1D7",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: "#78716C",
                textTransform: "uppercase",
                marginBottom: 8,
                letterSpacing: "0.06em",
              }}
            >
              KEY CAPABILITIES:
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>
              {currentStep.details.map((detail, i) => (
                <li key={i} style={{ fontSize: 13.5, color: "#44403C", lineHeight: 1.45 }}>
                  {detail}
                </li>
              ))}
            </ul>
          </div>

          {/* Sample Output Banner */}
          <div
            style={{
              background: "#F0FDF4",
              border: "1px solid #BBF7D0",
              borderRadius: 10,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12.5,
              color: "#166534",
              fontWeight: 600,
            }}
          >
            <span>⚡</span>
            <span>{currentStep.sampleOutput}</span>
          </div>
        </div>

        {/* ── Footer Navigation Actions (Cream & Black Luxury) ────────── */}
        <div
          style={{
            padding: "16px 28px",
            background: "#FAF7F2",
            borderTop: "1px solid #E7E1D7",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {/* Don't show again toggle */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: "#78716C",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              style={{ cursor: "pointer", accentColor: "#18181B" }}
            />
            Don't show this tour automatically again
          </label>

          {/* Stepper Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={handleBack}
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #D8CFC2",
                  borderRadius: 8,
                  padding: "8px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#44403C",
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
                color: "#78716C",
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
                background: "#18181B",
                border: "1px solid #27272A",
                borderRadius: 8,
                padding: "8px 20px",
                fontSize: 13,
                fontWeight: 600,
                color: "#FAF7F2",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(24, 24, 27, 0.25)",
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

/** Global trigger function */
export function openProductTour() {
  window.dispatchEvent(new CustomEvent("finsight:open-tour"));
}
