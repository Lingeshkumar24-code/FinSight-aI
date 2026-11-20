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
        background: "#FFFFFF",
        color: "#0F172A",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* ── Fixed Sticky Navbar (Agama One style) ────────────────────── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid #E2E8F0",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <AICFOAvatar size={38} compact />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", letterSpacing: "-0.02em" }}>
              FinSight AI
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#64748B", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Executive Financial Command Center
            </div>
          </div>
        </div>

        {/* Center Nav Anchors */}
        <nav style={{ display: "flex", alignItems: "center", gap: 24 }} className="hidden-mobile">
          <a href="#overview" style={{ textDecoration: "none", color: "#475569", fontSize: 13, fontWeight: 500 }}>
            Overview
          </a>
          <a href="#agentic-rag" style={{ textDecoration: "none", color: "#475569", fontSize: 13, fontWeight: 500 }}>
            Agentic RAG
          </a>
          <a href="#market" style={{ textDecoration: "none", color: "#475569", fontSize: 13, fontWeight: 500 }}>
            Market Intelligence
          </a>
          <a href="#simulator" style={{ textDecoration: "none", color: "#475569", fontSize: 13, fontWeight: 500 }}>
            What-If Levers
          </a>
          <a href="#fraud" style={{ textDecoration: "none", color: "#475569", fontSize: 13, fontWeight: 500 }}>
            Fraud Shield
          </a>
        </nav>

        {/* Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            onClick={() => setTourOpen(true)}
            style={{
              background: "#EFF6FF",
              border: "1px solid #BFDBFE",
              color: "#2563EB",
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            🎓 Guided Tour
          </button>
          <Link
            to="/login"
            style={{
              textDecoration: "none",
              background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
              color: "#FFFFFF",
              borderRadius: 8,
              padding: "8px 18px",
              fontSize: 13,
              fontWeight: 600,
              boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)",
            }}
          >
            Sign In to Portal →
          </Link>
        </div>
      </header>

      {/* ── Hero Section (Agama One inspired layout) ──────────────────── */}
      <section
        id="overview"
        style={{
          padding: "72px 24px 48px",
          maxWidth: 1100,
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
            background: "#EFF6FF",
            border: "1px solid #BFDBFE",
            borderRadius: 9999,
            padding: "6px 16px",
            fontSize: 12.5,
            fontWeight: 600,
            color: "#2563EB",
            marginBottom: 20,
          }}
        >
          <span>✨</span>
          <span>One Intelligent Financial Command Center for Your Business</span>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: "clamp(32px, 5vw, 54px)",
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            color: "#0F172A",
            maxWidth: 900,
            margin: "0 auto 20px",
          }}
        >
          Run your enterprise finances from one{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            intelligent AI command center.
          </span>
        </h1>

        {/* Subhead */}
        <p
          style={{
            fontSize: "clamp(15px, 2vw, 18px)",
            color: "#475569",
            maxWidth: 760,
            margin: "0 auto 32px",
            lineHeight: 1.6,
          }}
        >
          FinSight AI unites 20+ sheet financial workbooks, autonomous agentic RAG, real-time NSE/BSE candlestick analytics, causal what-if simulations, and forensic fraud detection into verified, actionable executive intelligence.
        </p>

        {/* Dual CTAs */}
        <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap", marginBottom: 36 }}>
          <Link
            to="/login"
            style={{
              textDecoration: "none",
              background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
              color: "#FFFFFF",
              borderRadius: 10,
              padding: "13px 28px",
              fontSize: 15,
              fontWeight: 600,
              boxShadow: "0 6px 20px rgba(37, 99, 235, 0.35)",
            }}
          >
            Launch Free Workspace →
          </Link>
          <button
            type="button"
            onClick={() => setTourOpen(true)}
            style={{
              background: "#F8FAFC",
              border: "1px solid #CBD5E1",
              borderRadius: 10,
              padding: "13px 24px",
              fontSize: 15,
              fontWeight: 600,
              color: "#334155",
              cursor: "pointer",
            }}
          >
            Explore Interactive Tour
          </button>
        </div>

        {/* Feature Checklist */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: 16,
            fontSize: 12.5,
            color: "#64748B",
            fontWeight: 500,
          }}
        >
          <span>✓ 22-Sheet Excel RAG</span>
          <span>·</span>
          <span>✓ CFO Debt Capacity Reasoning</span>
          <span>·</span>
          <span>✓ Real-Time NSE/BSE Candlesticks</span>
          <span>·</span>
          <span>✓ Causal What-If Levers</span>
          <span>·</span>
          <span>✓ Benford's Fraud Checks</span>
          <span>·</span>
          <span>✓ Automated Alerts</span>
        </div>
      </section>

      {/* ── Interactive Dashboard Preview ("Your business at a glance") ── */}
      <section
        style={{
          maxWidth: 1100,
          margin: "0 auto 80px",
          padding: "0 24px",
        }}
      >
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 20,
            border: "1px solid #E2E8F0",
            boxShadow: "0 20px 50px -15px rgba(15, 23, 42, 0.12)",
            overflow: "hidden",
            padding: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", letterSpacing: "0.08em" }}>
                LIVE EXECUTIVE PREVIEW
              </div>
              <h3 style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 700, color: "#0F172A" }}>
                Enterprise Financial Performance Overview
              </h3>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#166534",
                background: "#DCFCE7",
                padding: "4px 10px",
                borderRadius: 9999,
              }}
            >
              ● Connected · v0.1 Production
            </span>
          </div>

          {/* Metric cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div style={{ background: "#F8FAFC", padding: "16px", borderRadius: 12, border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase" }}>Net Profit Margin</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#16A34A", marginTop: 4 }}>18.7%</div>
              <div style={{ fontSize: 11, color: "#16A34A", marginTop: 2 }}>▲ +2.4% vs previous quarter</div>
            </div>
            <div style={{ background: "#F8FAFC", padding: "16px", borderRadius: 12, border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase" }}>Current Ratio</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#2563EB", marginTop: 4 }}>2.196x</div>
              <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>Optimal liquidity health</div>
            </div>
            <div style={{ background: "#F8FAFC", padding: "16px", borderRadius: 12, border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase" }}>Closing Cash Buffer</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", marginTop: 4 }}>₹23,50,000</div>
              <div style={{ fontSize: 11, color: "#D97706", marginTop: 2 }}>1.5 Months operating runway</div>
            </div>
            <div style={{ background: "#F8FAFC", padding: "16px", borderRadius: 12, border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase" }}>Debt Burden (EMI)</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#DC2626", marginTop: 4 }}>₹1,26,000/mo</div>
              <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>Total Debt: ₹28,10,000 (3 loans)</div>
            </div>
          </div>

          {/* Dual Lower preview */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
            {/* Candlestick snippet */}
            <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "16px", border: "1px solid #E2E8F0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div>
                  <strong style={{ fontSize: 14, color: "#0F172A" }}>Reliance Industries (RELIANCE.NS)</strong>
                  <div style={{ fontSize: 11, color: "#64748B" }}>NSE · Candlestick with SMA 20/50 & Volume</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#0F172A" }}>₹1,358.40</span>
                  <span style={{ display: "block", fontSize: 11, color: "#DC2626", fontWeight: 600 }}>-17.20 (-1.25%)</span>
                </div>
              </div>
              <div style={{ height: 120, background: "#FFFFFF", borderRadius: 8, border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B", fontSize: 12 }}>
                📈 Real-Time Candlestick Chart, Overlays (SMA 20/50, EMA 12/26) & Volume Sub-Pane Active
              </div>
            </div>

            {/* Agentic RAG Decision preview */}
            <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "16px", border: "1px solid #E2E8F0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 18 }}>🧠</span>
                <strong style={{ fontSize: 14, color: "#0F172A" }}>Agentic RAG CFO Advisory Decision</strong>
              </div>
              <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, padding: "10px 14px", marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#991B1B" }}>
                  DECISION: DO NOT TAKE AN ADDITIONAL COMMERCIAL LOAN
                </div>
                <div style={{ fontSize: 11, color: "#7F1D1D", marginTop: 2 }}>
                  Negative operating cash flow (-₹62.1L in FY26) consumes liquidity. Prioritize collecting ₹6,61,953 in trade receivables.
                </div>
              </div>
              <div style={{ fontSize: 11, color: "#64748B" }}>
                📎 Grounded from 22-Sheet Workbook: Annual P&L (chunk 1148), Balance Sheet (chunk 1148), Cash Flow (chunk 1150)
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Core Platform Pillars (Agama One 2-Column Grid) ─────────── */}
      <section
        id="agentic-rag"
        style={{
          maxWidth: 1100,
          margin: "0 auto 80px",
          padding: "0 24px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", letterSpacing: "0.08em" }}>
            MODULAR INTELLIGENCE
          </div>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: "#0F172A", margin: "6px 0 12px" }}>
            Comprehensive Executive Financial Capabilities
          </h2>
          <p style={{ fontSize: 15, color: "#64748B", maxWidth: 640, margin: "0 auto" }}>
            Every tool is purpose-built to deliver deterministic, auditable decisions for business owners and CFOs.
          </p>
        </div>

        {/* 6 Grid Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 24,
          }}
        >
          {/* Card 1 */}
          <div style={{ background: "#FFFFFF", borderRadius: 16, padding: "24px", border: "1px solid #E2E8F0", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "#EFF6FF", display: "grid", placeItems: "center", fontSize: 22, marginBottom: 16 }}>
              📂
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", margin: "0 0 8px" }}>
              Agentic RAG Document Ingestion
            </h3>
            <p style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.5, margin: "0 0 16px" }}>
              Streaming ingestion of complex 22-sheet Excel workbooks in 3.4 seconds. Section-aware chunking tracks exact sheet origins with 100% citation coverage.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["22 Sheets", "100% Tracking", "CFO Reasoning", "Noise Filtering"].map((t) => (
                <span key={t} style={{ fontSize: 11, fontWeight: 600, color: "#2563EB", background: "#EFF6FF", padding: "3px 8px", borderRadius: 6 }}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Card 2 */}
          <div id="market" style={{ background: "#FFFFFF", borderRadius: 16, padding: "24px", border: "1px solid #E2E8F0", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "#EFF6FF", display: "grid", placeItems: "center", fontSize: 22, marginBottom: 16 }}>
              📈
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", margin: "0 0 8px" }}>
              Candlestick Market Intelligence
            </h3>
            <p style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.5, margin: "0 0 16px" }}>
              Professional interactive candlestick and line charts for Indian equities (NSE/BSE). Real-time SMA 20/50 and EMA 12/26 overlays with integrated volume sub-pane.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["Candlestick & Line", "SMA 20/50", "EMA 12/26", "Volume Subplot"].map((t) => (
                <span key={t} style={{ fontSize: 11, fontWeight: 600, color: "#2563EB", background: "#EFF6FF", padding: "3px 8px", borderRadius: 6 }}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Card 3 */}
          <div id="simulator" style={{ background: "#FFFFFF", borderRadius: 16, padding: "24px", border: "1px solid #E2E8F0", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "#EFF6FF", display: "grid", placeItems: "center", fontSize: 22, marginBottom: 16 }}>
              🎛️
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", margin: "0 0 8px" }}>
              Causal What-If Scenario Simulator
            </h3>
            <p style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.5, margin: "0 0 16px" }}>
              Dynamic financial levers to forecast revenue growth, COGS changes, OpEx cuts, and debt service over 12–36 periods before making capital commitments.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["Causal Levers", "Ending Cash Forecast", "Burn Rate", "Break-Even"].map((t) => (
                <span key={t} style={{ fontSize: 11, fontWeight: 600, color: "#2563EB", background: "#EFF6FF", padding: "3px 8px", borderRadius: 6 }}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Card 4 */}
          <div style={{ background: "#FFFFFF", borderRadius: 16, padding: "24px", border: "1px solid #E2E8F0", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "#EFF6FF", display: "grid", placeItems: "center", fontSize: 22, marginBottom: 16 }}>
              💼
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", margin: "0 0 8px" }}>
              Paper Trading & Treasury Portfolio
            </h3>
            <p style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.5, margin: "0 0 16px" }}>
              Risk-free virtual trade execution for excess business reserves. Track simulated equity positions, portfolio P&L, and test corporate hedging strategies.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["Virtual Orders", "Zero Risk", "Portfolio Ledger", "Treasury Simulation"].map((t) => (
                <span key={t} style={{ fontSize: 11, fontWeight: 600, color: "#2563EB", background: "#EFF6FF", padding: "3px 8px", borderRadius: 6 }}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Card 5 */}
          <div id="fraud" style={{ background: "#FFFFFF", borderRadius: 16, padding: "24px", border: "1px solid #E2E8F0", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "#EFF6FF", display: "grid", placeItems: "center", fontSize: 22, marginBottom: 16 }}>
              🛡️
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", margin: "0 0 8px" }}>
              Forensic Fraud Detection & Auditing
            </h3>
            <p style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.5, margin: "0 0 16px" }}>
              First-digit Benford's Law anomaly scanning, duplicate transaction recognition, and invoice splitting detection to safeguard company funds.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["Benford's Law", "Duplicate Invoices", "Split Payments", "Z-Score Flags"].map((t) => (
                <span key={t} style={{ fontSize: 11, fontWeight: 600, color: "#2563EB", background: "#EFF6FF", padding: "3px 8px", borderRadius: 6 }}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Card 6 */}
          <div style={{ background: "#FFFFFF", borderRadius: 16, padding: "24px", border: "1px solid #E2E8F0", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "#EFF6FF", display: "grid", placeItems: "center", fontSize: 22, marginBottom: 16 }}>
              ⚡
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", margin: "0 0 8px" }}>
              Autonomous 24/7 Monitoring & Alerts
            </h3>
            <p style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.5, margin: "0 0 16px" }}>
              Continuous background asyncio worker scanning covenants, runway depletion, and profitability shifts. Emits alerts and n8n webhooks automatically.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["2-Min Cron", "n8n Webhook", "Covenant Breach", "Email & Notification"].map((t) => (
                <span key={t} style={{ fontSize: 11, fontWeight: 600, color: "#2563EB", background: "#EFF6FF", padding: "3px 8px", borderRadius: 6 }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── AGAMA AI Style Dark Section: AI CFO Showcase ────────────── */}
      <section
        style={{
          maxWidth: 1100,
          margin: "0 auto 80px",
          padding: "0 24px",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #090B1E 0%, #131742 50%, #0B0E23 100%)",
            borderRadius: 24,
            padding: "48px 36px",
            color: "#FFFFFF",
            boxShadow: "0 25px 60px -15px rgba(11, 14, 35, 0.45)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Subtle glowing orb */}
          <div
            style={{
              position: "absolute",
              top: "-20%",
              right: "10%",
              width: 320,
              height: 320,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, transparent 70%)",
              filter: "blur(50px)",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            <AICFOAvatar size={100} expression="happy" />
            <div style={{ fontSize: 12, fontWeight: 700, color: "#38BDF8", letterSpacing: "0.08em", marginTop: 16 }}>
              AI CFO INTELLIGENCE LAYER
            </div>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: "#FFFFFF", margin: "6px 0 14px" }}>
              Ask Any Financial Question. Get Deterministic Decisions.
            </h2>
            <p style={{ fontSize: 15, color: "#94A3B8", maxWidth: 650, margin: "0 0 28px", lineHeight: 1.6 }}>
              Trained on corporate finance frameworks and connected directly to your company's indexed documents, FinSight AI refuses vague guesses and produces verified CFO calculations.
            </p>

            {/* Prompt pills */}
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, marginBottom: 32 }}>
              {[
                "Should we take a loan or not?",
                "In which stock can we invest surplus cash?",
                "Summarize our 3-year revenue and profit trajectory",
                "What is our debt service coverage ratio?",
              ].map((prompt) => (
                <span
                  key={prompt}
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.16)",
                    borderRadius: 9999,
                    padding: "8px 18px",
                    fontSize: 13,
                    color: "#E2E8F0",
                    fontWeight: 500,
                  }}
                >
                  "{prompt}"
                </span>
              ))}
            </div>

            <Link
              to="/login"
              style={{
                textDecoration: "none",
                background: "linear-gradient(135deg, #38BDF8 0%, #2563EB 100%)",
                color: "#FFFFFF",
                borderRadius: 10,
                padding: "12px 28px",
                fontSize: 14.5,
                fontWeight: 600,
                boxShadow: "0 4px 14px rgba(56, 189, 248, 0.35)",
              }}
            >
              Ask the AI CFO in Portal →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Bottom Call-To-Action Banner (Agama One style) ──────────── */}
      <section
        style={{
          maxWidth: 1100,
          margin: "0 auto 80px",
          padding: "0 24px",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #1E40AF 0%, #1D4ED8 100%)",
            borderRadius: 20,
            padding: "48px 32px",
            textAlign: "center",
            color: "#FFFFFF",
            boxShadow: "0 15px 35px -10px rgba(37, 99, 235, 0.4)",
          }}
        >
          <h2 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 12px" }}>
            One platform. Your entire financial command center.
          </h2>
          <p style={{ fontSize: 16, color: "#DBEAFE", maxWidth: 600, margin: "0 auto 28px" }}>
            Deploy FinSight AI for your business today with zero configuration needed.
          </p>
          <Link
            to="/login"
            style={{
              textDecoration: "none",
              background: "#FFFFFF",
              color: "#1D4ED8",
              borderRadius: 10,
              padding: "13px 30px",
              fontSize: 15,
              fontWeight: 700,
              display: "inline-block",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          >
            Launch Free Workspace →
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid #E2E8F0",
          padding: "32px 24px",
          maxWidth: 1100,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          fontSize: 13,
          color: "#64748B",
        }}
      >
        <div>
          <strong>FinSight AI</strong> · Executive Business Financial Intelligence & Decision Support.
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          <button type="button" onClick={() => setTourOpen(true)} style={{ background: "none", border: "none", color: "#2563EB", cursor: "pointer", fontSize: 13, padding: 0 }}>
            Product Walkthrough
          </button>
          <Link to="/login" style={{ color: "#2563EB", textDecoration: "none" }}>
            Sign In Portal
          </Link>
        </div>
      </footer>

      {/* ── Onboarding Modal Tour Preview ────────────────────────────── */}
      <OnboardingModal forceOpen={tourOpen} onClose={() => setTourOpen(false)} />
    </div>
  );
}
