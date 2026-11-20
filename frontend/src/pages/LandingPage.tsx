import { useState } from "react";
import { Link } from "react-router-dom";
import { AICFOAvatar } from "../components/ai/AICFOAvatar";
import { OnboardingModal } from "../components/onboarding/OnboardingModal";

export function LandingPage() {
  const [tourOpen, setTourOpen] = useState(false);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FAF7F2", // Luxury warm cream
        color: "#1C1917", // Rich obsidian black
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      {/* ── Fixed Sticky Navbar (Cream & Black Luxury Theme) ────────── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(250, 247, 242, 0.92)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderBottom: "1px solid #E7E1D7",
          padding: "14px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <AICFOAvatar size={40} compact />
          <div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "#141312",
                letterSpacing: "-0.02em",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              FinSight AI
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: "#18181B",
                  color: "#FAF7F2",
                  padding: "2px 6px",
                  borderRadius: 4,
                  letterSpacing: "0.04em",
                }}
              >
                BUSINESS
              </span>
            </div>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: "#78716C",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              The Intelligent Financial Command Center
            </div>
          </div>
        </div>

        {/* Center Navigation */}
        <nav
          style={{ display: "flex", alignItems: "center", gap: 28 }}
          className="hidden-mobile"
        >
          <a
            href="#overview"
            style={{
              textDecoration: "none",
              color: "#44403C",
              fontSize: 13.5,
              fontWeight: 500,
            }}
          >
            Overview
          </a>
          <a
            href="#spreadsheets"
            style={{
              textDecoration: "none",
              color: "#44403C",
              fontSize: 13.5,
              fontWeight: 500,
            }}
          >
            Spreadsheet Reader
          </a>
          <a
            href="#advisor"
            style={{
              textDecoration: "none",
              color: "#44403C",
              fontSize: 13.5,
              fontWeight: 500,
            }}
          >
            AI CFO
          </a>
          <a
            href="#simulator"
            style={{
              textDecoration: "none",
              color: "#44403C",
              fontSize: 13.5,
              fontWeight: 500,
            }}
          >
            What-If Scenarios
          </a>
          <a
            href="#fraud"
            style={{
              textDecoration: "none",
              color: "#44403C",
              fontSize: 13.5,
              fontWeight: 500,
            }}
          >
            Fraud Shield
          </a>
        </nav>

        {/* Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            onClick={() => setTourOpen(true)}
            style={{
              background: "#F2ECE1",
              border: "1px solid #D8CFC2",
              color: "#292524",
              borderRadius: 8,
              padding: "8px 15px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            🎓 Guided Tour
          </button>
          <Link
            to="/login"
            style={{
              textDecoration: "none",
              background: "#18181B",
              color: "#FAF7F2",
              border: "1px solid #27272A",
              borderRadius: 8,
              padding: "8px 18px",
              fontSize: 13,
              fontWeight: 600,
              boxShadow: "0 2px 8px rgba(24, 24, 27, 0.2)",
              transition: "all 0.15s ease",
            }}
          >
            Sign In to Portal →
          </Link>
        </div>
      </header>

      {/* ── Hero Section (Cream & Black Executive Typography) ─────────── */}
      <section
        id="overview"
        style={{
          padding: "76px 24px 44px",
          maxWidth: 1080,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        {/* Micro-pill tag */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "#F5EFE6",
            border: "1px solid #DFD5C6",
            borderRadius: 9999,
            padding: "6px 16px",
            fontSize: 12.5,
            fontWeight: 600,
            color: "#44403C",
            marginBottom: 24,
          }}
        >
          <span style={{ color: "#D97706" }}>★</span>
          <span>Plain-English Financial Intelligence for Business Owners & Founders</span>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: "clamp(32px, 5.2vw, 56px)",
            fontWeight: 800,
            lineHeight: 1.14,
            letterSpacing: "-0.03em",
            color: "#141312",
            maxWidth: 920,
            margin: "0 auto 20px",
          }}
        >
          Run your business finances with the clarity of a{" "}
          <span
            style={{
              color: "#0F0E0D",
              textDecoration: "underline",
              textDecorationColor: "#D4AF37",
              textUnderlineOffset: 6,
            }}
          >
            world-class CFO
          </span>
          .
        </h1>

        {/* Subhead written for non-technical leaders */}
        <p
          style={{
            fontSize: "clamp(15px, 2vw, 18px)",
            color: "#57534E",
            maxWidth: 780,
            margin: "0 auto 34px",
            lineHeight: 1.65,
          }}
        >
          No complex accounting jargon, no confusing spreadsheet formulas. FinSight reads your
          Excel workbooks, bank statements, and bills to give you crystal-clear answers:
          <strong> Can you afford to hire? Should you take a bank loan? Where is cash leaking?</strong>
        </p>

        {/* Primary CTAs */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            flexWrap: "wrap",
            marginBottom: 36,
          }}
        >
          <Link
            to="/login"
            style={{
              textDecoration: "none",
              background: "#18181B",
              color: "#FAF7F2",
              border: "1px solid #27272A",
              borderRadius: 10,
              padding: "13px 28px",
              fontSize: 14.5,
              fontWeight: 600,
              boxShadow: "0 4px 16px rgba(24, 24, 27, 0.25)",
            }}
          >
            Launch FinSight Workspace →
          </Link>
          <button
            type="button"
            onClick={() => setTourOpen(true)}
            style={{
              background: "#FFFFFF",
              border: "1px solid #D8CFC2",
              color: "#1C1917",
              borderRadius: 10,
              padding: "13px 22px",
              fontSize: 14.5,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
            }}
          >
            Take 2-Minute Interactive Tour 🎓
          </button>
        </div>

        {/* Key business guarantees */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
            flexWrap: "wrap",
            fontSize: 12.5,
            color: "#78716C",
            fontWeight: 500,
          }}
        >
          <span>✓ Works with Your Existing Excel Files</span>
          <span>·</span>
          <span>✓ Plain-English Loan & Cash Decisions</span>
          <span>·</span>
          <span>✓ Visual What-If Sliders</span>
          <span>·</span>
          <span>✓ Automatic Fraud Watchdog</span>
        </div>
      </section>

      {/* ── Interactive Executive Dashboard Preview (Cream & Black) ───── */}
      <section
        style={{
          maxWidth: 1080,
          margin: "0 auto 84px",
          padding: "0 24px",
        }}
      >
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 20,
            border: "1px solid #E7E1D7",
            boxShadow: "0 20px 48px -12px rgba(28, 25, 23, 0.08)",
            overflow: "hidden",
            padding: "28px",
          }}
        >
          {/* Header Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 22,
              paddingBottom: 16,
              borderBottom: "1px solid #F2ECE1",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#78716C",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                LIVE BUSINESS HEALTH PREVIEW
              </div>
              <h3
                style={{
                  margin: "4px 0 0",
                  fontSize: 21,
                  fontWeight: 700,
                  color: "#141312",
                }}
              >
                Your Entire Business at a Glance — Explained in Plain English
              </h3>
            </div>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                color: "#15803D",
                background: "#DCFCE7",
                border: "1px solid #BBF7D0",
                padding: "4px 12px",
                borderRadius: 9999,
              }}
            >
              ● Connected · Live Verified Data
            </span>
          </div>

          {/* Metric Cards Explained for Business Owners */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
              marginBottom: 24,
            }}
          >
            {/* Net Margin */}
            <div
              style={{
                background: "#FAF7F2",
                padding: "18px",
                borderRadius: 14,
                border: "1px solid #E7E1D7",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#78716C",
                  textTransform: "uppercase",
                }}
              >
                Net Profit Margin
              </div>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 800,
                  color: "#15803D",
                  marginTop: 4,
                }}
              >
                18.7%
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#44403C",
                  marginTop: 4,
                  lineHeight: 1.4,
                }}
              >
                You keep <strong>18.7 paise profit</strong> on every ₹1 of revenue earned.
              </div>
            </div>

            {/* Solvency / Current Ratio */}
            <div
              style={{
                background: "#FAF7F2",
                padding: "18px",
                borderRadius: 14,
                border: "1px solid #E7E1D7",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#78716C",
                  textTransform: "uppercase",
                }}
              >
                Bill Payment Safety
              </div>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 800,
                  color: "#18181B",
                  marginTop: 4,
                }}
              >
                2.196x
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#44403C",
                  marginTop: 4,
                  lineHeight: 1.4,
                }}
              >
                You own <strong>₹2.20 in liquid assets</strong> for every ₹1 of upcoming bills.
              </div>
            </div>

            {/* Cash in Bank */}
            <div
              style={{
                background: "#FAF7F2",
                padding: "18px",
                borderRadius: 14,
                border: "1px solid #E7E1D7",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#78716C",
                  textTransform: "uppercase",
                }}
              >
                Closing Cash Buffer
              </div>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 800,
                  color: "#141312",
                  marginTop: 4,
                }}
              >
                ₹23,50,000
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#B45309",
                  marginTop: 4,
                  lineHeight: 1.4,
                }}
              >
                Enough cash to run for <strong>1.5 months</strong> with zero incoming sales.
              </div>
            </div>

            {/* Debt Burden (EMI) */}
            <div
              style={{
                background: "#FAF7F2",
                padding: "18px",
                borderRadius: 14,
                border: "1px solid #E7E1D7",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#78716C",
                  textTransform: "uppercase",
                }}
              >
                Debt Burden (EMI)
              </div>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 800,
                  color: "#B91C1C",
                  marginTop: 4,
                }}
              >
                ₹1,26,000/mo
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#44403C",
                  marginTop: 4,
                  lineHeight: 1.4,
                }}
              >
                3 active loans (₹28.1L total). AI advises paying this down before new borrowing.
              </div>
            </div>
          </div>

          {/* Lower Two Columns: Stock Investment & AI Decision */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 18,
            }}
          >
            {/* Stock Chart Preview */}
            <div
              style={{
                background: "#FAF7F2",
                borderRadius: 14,
                padding: "18px",
                border: "1px solid #E7E1D7",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <div>
                  <strong style={{ fontSize: 14.5, color: "#141312" }}>
                    Reliance Industries (RELIANCE.NS)
                  </strong>
                  <div style={{ fontSize: 11.5, color: "#78716C" }}>
                    Live NSE Stock Trend · Visual SMA 20/50 & Volume Tracking
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: "#141312" }}>
                    ₹1,358.40
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontSize: 11,
                      color: "#B91C1C",
                      fontWeight: 600,
                    }}
                  >
                    -17.20 (-1.25%)
                  </span>
                </div>
              </div>
              <div
                style={{
                  height: 110,
                  background: "#FFFFFF",
                  borderRadius: 10,
                  border: "1px solid #E7E1D7",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#57534E",
                  fontSize: 12.5,
                  padding: "12px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontWeight: 600, color: "#141312", marginBottom: 2 }}>
                  📊 Professional Candlesticks & Technical Overlays
                </div>
                <div>
                  Helps business owners safely park surplus reserves into blue-chip Indian equities with virtual paper trading.
                </div>
              </div>
            </div>

            {/* AI Advisor Decision Box */}
            <div
              style={{
                background: "#18181B", // Premium dark contrast card
                borderRadius: 14,
                padding: "18px",
                border: "1px solid #27272A",
                color: "#FAF7F2",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    background: "#F59E0B",
                    color: "#000000",
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "3px 8px",
                    borderRadius: 4,
                  }}
                >
                  AI CFO DECISION
                </span>
                <span style={{ fontSize: 12, color: "#A1A1AA" }}>
                  Question: "Can we take a ₹10,00,000 expansion loan?"
                </span>
              </div>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: "#FCA5A5",
                  marginBottom: 6,
                }}
              >
                DECISION: DO NOT BORROW RIGHT NOW
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#D4D4D8",
                  lineHeight: 1.5,
                }}
              >
                Your current monthly loan payment is already ₹1,26,000 across 3 loans. A new loan
                would push your cash runway down to 22 days.
                <br />
                <span style={{ color: "#86EFAC", fontWeight: 600 }}>
                  Recommended Action: Collect ₹6,61,953 in overdue customer receivables first.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6 Core Business Capabilities (Plain English for Non-Techs) ── */}
      <section
        id="spreadsheets"
        style={{
          maxWidth: 1080,
          margin: "0 auto 88px",
          padding: "0 24px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: "#78716C",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            DESIGNED FOR BUSY BUSINESS OWNERS
          </div>
          <h2
            style={{
              fontSize: 34,
              fontWeight: 800,
              color: "#141312",
              margin: "8px 0 14px",
              letterSpacing: "-0.02em",
            }}
          >
            Everything You Need to Protect & Grow Your Company
          </h2>
          <p
            style={{
              fontSize: 15.5,
              color: "#57534E",
              maxWidth: 680,
              margin: "0 auto",
              lineHeight: 1.6,
            }}
          >
            No complicated financial models or code. Each tool is built to solve everyday
            business problems and give you answers you can act on immediately.
          </p>
        </div>

        {/* 6 Grid Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 22,
          }}
        >
          {/* Card 1 */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 16,
              padding: "26px",
              border: "1px solid #E7E1D7",
              boxShadow: "0 4px 12px rgba(28, 25, 23, 0.03)",
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: "#F5EFE6",
                display: "grid",
                placeItems: "center",
                fontSize: 22,
                marginBottom: 16,
              }}
            >
              📂
            </div>
            <h3
              style={{
                fontSize: 19,
                fontWeight: 700,
                color: "#141312",
                margin: "0 0 8px",
              }}
            >
              Spreadsheet & Document Reader
            </h3>
            <p
              style={{
                fontSize: 14,
                color: "#57534E",
                lineHeight: 1.55,
                margin: "0 0 16px",
              }}
            >
              Upload messy 20+ sheet Excel workbooks, bank statements, or invoices. FinSight reads
              thousands of numbers in 3 seconds so you can ask questions without opening Excel formulas.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["22-Sheet Excel", "Bank Statements", "Zero Accounting Jargon", "Instant Answers"].map(
                (t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: "#44403C",
                      background: "#F5EFE6",
                      padding: "4px 9px",
                      borderRadius: 6,
                    }}
                  >
                    {t}
                  </span>
                )
              )}
            </div>
          </div>

          {/* Card 2 */}
          <div
            id="advisor"
            style={{
              background: "#FFFFFF",
              borderRadius: 16,
              padding: "26px",
              border: "1px solid #E7E1D7",
              boxShadow: "0 4px 12px rgba(28, 25, 23, 0.03)",
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: "#F5EFE6",
                display: "grid",
                placeItems: "center",
                fontSize: 22,
                marginBottom: 16,
              }}
            >
              🧠
            </div>
            <h3
              style={{
                fontSize: 19,
                fontWeight: 700,
                color: "#141312",
                margin: "0 0 8px",
              }}
            >
              Your 24/7 AI Chief Financial Officer
            </h3>
            <p
              style={{
                fontSize: 14,
                color: "#57534E",
                lineHeight: 1.55,
                margin: "0 0 16px",
              }}
            >
              Tells you clearly: Should you borrow from the bank or not? We calculate your monthly
              debt EMIs against your actual revenues so you never risk running out of cash.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["Loan Decisions", "Cash Cushion Analysis", "Hiring Budgets", "Pay Down Debt"].map(
                (t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: "#44403C",
                      background: "#F5EFE6",
                      padding: "4px 9px",
                      borderRadius: 6,
                    }}
                  >
                    {t}
                  </span>
                )
              )}
            </div>
          </div>

          {/* Card 3 */}
          <div
            id="simulator"
            style={{
              background: "#FFFFFF",
              borderRadius: 16,
              padding: "26px",
              border: "1px solid #E7E1D7",
              boxShadow: "0 4px 12px rgba(28, 25, 23, 0.03)",
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: "#F5EFE6",
                display: "grid",
                placeItems: "center",
                fontSize: 22,
                marginBottom: 16,
              }}
            >
              🎛️
            </div>
            <h3
              style={{
                fontSize: 19,
                fontWeight: 700,
                color: "#141312",
                margin: "0 0 8px",
              }}
            >
              Test Decisions Before Spending Real Money
            </h3>
            <p
              style={{
                fontSize: 14,
                color: "#57534E",
                lineHeight: 1.55,
                margin: "0 0 16px",
              }}
            >
              What if sales drop 15% next quarter? What if supplier costs jump 8%? Move intuitive
              sliders to see your bank balance 12 months ahead before signing contracts or hiring.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["Visual Sliders", "12-Month Projections", "Break-Even Point", "Zero Guesswork"].map(
                (t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: "#44403C",
                      background: "#F5EFE6",
                      padding: "4px 9px",
                      borderRadius: 6,
                    }}
                  >
                    {t}
                  </span>
                )
              )}
            </div>
          </div>

          {/* Card 4 */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 16,
              padding: "26px",
              border: "1px solid #E7E1D7",
              boxShadow: "0 4px 12px rgba(28, 25, 23, 0.03)",
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: "#F5EFE6",
                display: "grid",
                placeItems: "center",
                fontSize: 22,
                marginBottom: 16,
              }}
            >
              📈
            </div>
            <h3
              style={{
                fontSize: 19,
                fontWeight: 700,
                color: "#141312",
                margin: "0 0 8px",
              }}
            >
              Stock Trends & Idle Cash Growth
            </h3>
            <p
              style={{
                fontSize: 14,
                color: "#57534E",
                lineHeight: 1.55,
                margin: "0 0 16px",
              }}
            >
              Don't let company cash sit idle losing value. Follow live NSE/BSE stock trends and
              practice virtual paper trades with zero risk to see how excess reserves could grow.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["NSE/BSE Indian Equities", "Candlestick Charts", "Paper Trading", "Zero Risk"].map(
                (t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: "#44403C",
                      background: "#F5EFE6",
                      padding: "4px 9px",
                      borderRadius: 6,
                    }}
                  >
                    {t}
                  </span>
                )
              )}
            </div>
          </div>

          {/* Card 5 */}
          <div
            id="fraud"
            style={{
              background: "#FFFFFF",
              borderRadius: 16,
              padding: "26px",
              border: "1px solid #E7E1D7",
              boxShadow: "0 4px 12px rgba(28, 25, 23, 0.03)",
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: "#F5EFE6",
                display: "grid",
                placeItems: "center",
                fontSize: 22,
                marginBottom: 16,
              }}
            >
              🛡️
            </div>
            <h3
              style={{
                fontSize: 19,
                fontWeight: 700,
                color: "#141312",
                margin: "0 0 8px",
              }}
            >
              Automatic Fraud & Duplicate Bill Shield
            </h3>
            <p
              style={{
                fontSize: 14,
                color: "#57534E",
                lineHeight: 1.55,
                margin: "0 0 16px",
              }}
            >
              Protects your bank accounts from billing mistakes, double payments, and supplier fraud.
              Automatically flags suspicious vendor invoices before money ever leaves your bank.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["Duplicate Invoice Catch", "Split Payment Alerts", "Vendor Audits", "Bank Protection"].map(
                (t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: "#44403C",
                      background: "#F5EFE6",
                      padding: "4px 9px",
                      borderRadius: 6,
                    }}
                  >
                    {t}
                  </span>
                )
              )}
            </div>
          </div>

          {/* Card 6 */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 16,
              padding: "26px",
              border: "1px solid #E7E1D7",
              boxShadow: "0 4px 12px rgba(28, 25, 23, 0.03)",
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: "#F5EFE6",
                display: "grid",
                placeItems: "center",
                fontSize: 22,
                marginBottom: 16,
              }}
            >
              ⚡
            </div>
            <h3
              style={{
                fontSize: 19,
                fontWeight: 700,
                color: "#141312",
                margin: "0 0 8px",
              }}
            >
              24/7 Financial Watchdog Alerts
            </h3>
            <p
              style={{
                fontSize: 14,
                color: "#57534E",
                lineHeight: 1.55,
                margin: "0 0 16px",
              }}
            >
              Never get surprised by an empty bank account or overdue bill. FinSight watches your
              numbers 24/7 and sends you instant alerts whenever cash drops below your safe cushion.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["Cash Runway Warnings", "Overdue Invoices", "Email & Webhooks", "Zero Surprises"].map(
                (t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: "#44403C",
                      background: "#F5EFE6",
                      padding: "4px 9px",
                      borderRadius: 6,
                    }}
                  >
                    {t}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── 4-Step Plain English Workflow ───────────────────────────── */}
      <section
        style={{
          maxWidth: 1080,
          margin: "0 auto 84px",
          padding: "0 24px",
        }}
      >
        <div
          style={{
            background: "#18181B", // Dark obsidian card for executive elegance
            borderRadius: 20,
            padding: "44px 32px",
            color: "#FAF7F2",
            border: "1px solid #27272A",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 38 }}>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#D4AF37", // Warm champagne gold
                textTransform: "uppercase",
              }}
            >
              HOW IT WORKS FOR YOU
            </span>
            <h2
              style={{
                fontSize: 28,
                fontWeight: 800,
                margin: "6px 0 10px",
                color: "#FFFFFF",
              }}
            >
              Four Simple Steps to Financial Peace of Mind
            </h2>
            <p style={{ fontSize: 14.5, color: "#A1A1AA", maxWidth: 620, margin: "0 auto" }}>
              You don't need an accounting team or expensive consultants. FinSight guides you from
              raw spreadsheets to confident business decisions.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 20,
            }}
          >
            {[
              {
                step: "01",
                title: "Drop in Your Files",
                desc: "Upload Excel workbooks, invoices, or bank statements in any format. Takes 3 seconds.",
              },
              {
                step: "02",
                title: "Ask Questions in Plain English",
                desc: "Ask your AI CFO about profits, loan capacity, and where your money is going.",
              },
              {
                step: "03",
                title: "Test Decisions with Sliders",
                desc: "Simulate what happens to your cash balance before you spend money on hiring or inventory.",
              },
              {
                step: "04",
                title: "Sleep Easy with 24/7 Watchdog",
                desc: "Continuous protection that catches duplicate bills and warns you before cash runs low.",
              },
            ].map((s) => (
              <div
                key={s.step}
                style={{
                  background: "#242427",
                  padding: "20px",
                  borderRadius: 12,
                  border: "1px solid #333338",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#D4AF37",
                    marginBottom: 8,
                  }}
                >
                  STEP {s.step}
                </div>
                <h4 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px", color: "#FFFFFF" }}>
                  {s.title}
                </h4>
                <p style={{ fontSize: 13, color: "#A1A1AA", lineHeight: 1.5, margin: 0 }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom Call to Action ───────────────────────────────────── */}
      <section
        style={{
          maxWidth: 1080,
          margin: "0 auto 84px",
          padding: "0 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            background: "#FAF7F2",
            border: "1px solid #E7E1D7",
            borderRadius: 20,
            padding: "48px 24px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.03)",
          }}
        >
          <h2
            style={{
              fontSize: "clamp(26px, 3.5vw, 36px)",
              fontWeight: 800,
              color: "#141312",
              margin: "0 0 12px",
            }}
          >
            Ready to Take Control of Your Business Numbers?
          </h2>
          <p
            style={{
              fontSize: 16,
              color: "#57534E",
              maxWidth: 620,
              margin: "0 auto 28px",
              lineHeight: 1.6,
            }}
          >
            Join business owners and executives who use FinSight AI to make confident capital
            decisions and eliminate financial guesswork.
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <Link
              to="/login"
              style={{
                textDecoration: "none",
                background: "#18181B",
                color: "#FAF7F2",
                border: "1px solid #27272A",
                borderRadius: 10,
                padding: "13px 30px",
                fontSize: 14.5,
                fontWeight: 600,
                boxShadow: "0 4px 14px rgba(24, 24, 27, 0.2)",
              }}
            >
              Sign In to Your Workspace →
            </Link>
            <button
              type="button"
              onClick={() => setTourOpen(true)}
              style={{
                background: "#FFFFFF",
                border: "1px solid #D8CFC2",
                color: "#1C1917",
                borderRadius: 10,
                padding: "13px 24px",
                fontSize: 14.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Explore Walkthrough 🎓
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid #E7E1D7",
          padding: "32px 28px",
          maxWidth: 1080,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          fontSize: 13,
          color: "#78716C",
        }}
      >
        <div>
          <strong>FinSight AI</strong> · Plain-English Financial Intelligence for Growing Businesses.
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          <button
            type="button"
            onClick={() => setTourOpen(true)}
            style={{
              background: "none",
              border: "none",
              color: "#18181B",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 13,
              padding: 0,
            }}
          >
            Product Walkthrough
          </button>
          <Link
            to="/login"
            style={{
              color: "#18181B",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Sign In Portal
          </Link>
        </div>
      </footer>

      {/* ── Onboarding Modal Tour Preview ────────────────────────────── */}
      <OnboardingModal forceOpen={tourOpen} onClose={() => setTourOpen(false)} />
    </div>
  );
}
