import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { AICFOAvatar } from "../components/ai/AICFOAvatar";
import { OnboardingModal } from "../components/onboarding/OnboardingModal";

const features = [
  [
    "01",
    "Spreadsheet & Document Reader",
    "Upload messy 20+ sheet Excel workbooks, bank statements, or invoices. FinSight reads thousands of numbers in 3.4 seconds with 100% citation tracking — no complex formulas needed.",
  ],
  [
    "02",
    "Your 24/7 AI Chief Financial Officer",
    "Tells you clearly: Should you borrow from the bank or not? Calculates your monthly debt EMIs against real revenues so you never risk running out of cash.",
  ],
  [
    "03",
    "Causal What-If Scenario Sliders",
    "What if sales drop 15% next quarter? What if supplier costs jump 8%? Move intuitive sliders to see your bank balance 12 months ahead before signing contracts or hiring.",
  ],
  [
    "04",
    "Stock Trends & Idle Cash Growth",
    "Don't let company cash sit idle losing value. Follow live NSE/BSE stock trends with moving averages and practice virtual paper trades with zero risk.",
  ],
  [
    "05",
    "Automatic Fraud & Billing Shield",
    "Protects your bank accounts from billing mistakes, double payments, and supplier fraud. Automatically flags suspicious vendor invoices before money leaves.",
  ],
  [
    "06",
    "Cash Flow & Liquidity Runway",
    "Understand your exact financial cushion. Tracks opening balance, burn rate, and projected cash runway down to the day.",
  ],
  [
    "07",
    "Capital Structure & Debt Capacity",
    "Review active business loans, monthly EMI commitments, interest rates, and financial stability from one unified perspective.",
  ],
  [
    "08",
    "24/7 Watchdog Alerts & Webhooks",
    "Never get surprised by an empty bank account or overdue bill. FinSight watches your numbers 24/7 and sends instant alerts when runway drops.",
  ],
];

export function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function getStarted() {
    navigate(isAuthenticated ? "/dashboard" : "/login?mode=register");
  }

  function scrollToId(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="landing">
      {/* ── Fixed Sticky Navigation ────────────────────────────────── */}
      <header className={`landing-nav${scrolled ? " is-scrolled" : ""}`}>
        <button className="landing-brand" onClick={() => scrollToId("top")} aria-label="FinSight AI home">
          <span className="brand-mark">F</span>
          <span>FinSight <strong>AI</strong></span>
        </button>
        <nav aria-label="Primary navigation">
          <button onClick={() => scrollToId("platform")}>Platform</button>
          <button onClick={() => scrollToId("preview")}>Dashboard</button>
          <button onClick={() => scrollToId("features")}>Features</button>
          <button onClick={() => scrollToId("how-it-works")}>How It Works</button>
          <button onClick={() => scrollToId("about")}>About</button>
        </nav>
        <div className="landing-nav-actions">
          <button className="landing-sign-in" onClick={() => setTourOpen(true)}>
            Guided Tour
          </button>
          <button className="landing-sign-in" onClick={() => navigate(isAuthenticated ? "/dashboard" : "/login?mode=login")}>
            Sign In
          </button>
          <button className="landing-primary landing-small" onClick={getStarted}>Get Started</button>
        </div>
      </header>

      <main>
        {/* ── Hero Section ───────────────────────────────────────────── */}
        <section className="landing-hero" id="top">
          <div className="hero-copy">
            <span className="hero-badge"><i /> YOUR INTELLIGENT AI CFO</span>
            <h1>Your entire financial world,<br /><em>One intelligent AI CFO.</em></h1>
            <p>
              No complex accounting jargon, no confusing spreadsheet formulas. FinSight reads your
              Excel workbooks, bank statements, and bills to give you crystal-clear answers:
              <strong> Can you afford to hire? Should you take a bank loan? Where is cash leaking?</strong>
            </p>
            <div className="hero-actions">
              <button className="landing-primary" onClick={getStarted}>Get Started <span aria-hidden="true">→</span></button>
              <button className="landing-secondary" onClick={() => scrollToId("preview")}>Explore Dashboard</button>
            </div>
            <div className="hero-services" aria-label="Platform capabilities">
              <span>Spreadsheet Reader</span><i />
              <span>Plain-English AI CFO</span><i />
              <span>What-If Sliders</span><i />
              <span>Stock Trends</span><i />
              <span>Fraud Shield</span><i />
              <span>24/7 Alerts</span>
            </div>
          </div>

          <div className="hero-visual" aria-label="FinSight AI dashboard preview">
            <div className="preview-shell">
              <div className="preview-topbar">
                <span className="preview-dot" />
                <span className="preview-dot" />
                <span className="preview-dot" />
                <span className="preview-title">Executive business overview</span>
              </div>
              <div className="preview-body">
                <aside className="preview-sidebar">
                  <b>F</b><span /><span /><span /><span />
                </aside>
                <div className="preview-content">
                  <div className="preview-heading"><span>Financial Performance</span><small>Verified data</small></div>
                  <div className="preview-metrics">
                    <div>
                      <span>Net Profit</span>
                      <strong style={{ color: "#16845B" }}>18.7% Margin</strong>
                    </div>
                    <div>
                      <span>Cash Buffer</span>
                      <strong>₹23,50,000</strong>
                    </div>
                    <div>
                      <span>Bill Safety</span>
                      <strong>2.196x Liquidity</strong>
                    </div>
                  </div>
                  <div className="preview-chart">
                    <div className="chart-bars" aria-hidden="true">
                      {[42, 58, 51, 72, 64, 82, 76, 88].map((height, index) => (
                        <span key={index} style={{ height: `${height}%` }} />
                      ))}
                    </div>
                    <div className="chart-line" aria-hidden="true" />
                  </div>
                </div>
              </div>
            </div>
            <div className="floating-insight">
              <span>AI CFO DECISION</span>
              <strong style={{ fontSize: 11, color: "#16845B" }}>Do Not Borrow · Collect Bills First</strong>
            </div>
          </div>
        </section>

        {/* ── Section: What is FinSight AI? ─────────────────────────── */}
        <section className="landing-section what-section" id="platform">
          <div className="section-heading">
            <span>WHAT IS FINSIGHT AI?</span>
            <h2>A clearer view of every business financial decision.</h2>
          </div>
          <div className="what-grid">
            <p>
              FinSight AI is built specifically for business owners, founders, and executives who want
              clear financial truth without getting lost in accounting spreadsheets. Simply upload your
              workbooks, and our intelligent AI reads every transaction to give you plain-English answers
              about your cash, debt, and profits.
            </p>
            <p>
              Instead of waiting weeks for accounting reports, FinSight tells you immediately whether you
              can afford to expand, whether you should take a bank loan, and how to safely invest surplus
              company cash into blue-chip Indian equities with zero guesswork.
            </p>
          </div>
        </section>

        {/* ── Section: Full Dashboard Preview & Explanation ─────────── */}
        <section className="landing-section dashboard-section" id="preview">
          <div className="section-heading split-heading">
            <div>
              <span>EXECUTIVE COMMAND CENTER</span>
              <h2>Your financial picture, fully explained.</h2>
            </div>
            <p>
              Every number tells a story. Here is how FinSight monitors your business health, evaluates
              loan risks, and projects cash runway.
            </p>
          </div>

          <div
            style={{
              marginTop: 44,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
            }}
          >
            <div
              style={{
                background: "#FFFEFA",
                border: "1px solid #DCD6CA",
                borderRadius: 14,
                padding: "20px",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: "#A58A62", letterSpacing: "0.08em" }}>
                PROFITABILITY
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#16845B", marginTop: 4 }}>
                18.7%
              </div>
              <div style={{ fontSize: 12.5, color: "#4E4B45", marginTop: 6, lineHeight: 1.45 }}>
                Net profit margin: You keep <strong>18.7 paise pure profit</strong> on every ₹1 of revenue earned.
              </div>
            </div>

            <div
              style={{
                background: "#FFFEFA",
                border: "1px solid #DCD6CA",
                borderRadius: 14,
                padding: "20px",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: "#A58A62", letterSpacing: "0.08em" }}>
                SOLVENCY HEALTH
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#171717", marginTop: 4 }}>
                2.196x
              </div>
              <div style={{ fontSize: 12.5, color: "#4E4B45", marginTop: 6, lineHeight: 1.45 }}>
                Bill payment safety: You own <strong>₹2.20 in liquid assets</strong> for every ₹1 of upcoming bills.
              </div>
            </div>

            <div
              style={{
                background: "#FFFEFA",
                border: "1px solid #DCD6CA",
                borderRadius: 14,
                padding: "20px",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: "#A58A62", letterSpacing: "0.08em" }}>
                CASH BUFFER
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#171717", marginTop: 4 }}>
                ₹23,50,000
              </div>
              <div style={{ fontSize: 12.5, color: "#B45309", marginTop: 6, lineHeight: 1.45 }}>
                Closing liquidity: Enough cash in the bank to run for <strong>1.5 months</strong> with zero incoming sales.
              </div>
            </div>

            <div
              style={{
                background: "#FFFEFA",
                border: "1px solid #DCD6CA",
                borderRadius: 14,
                padding: "20px",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: "#A58A62", letterSpacing: "0.08em" }}>
                DEBT BURDEN (EMI)
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#B91C1C", marginTop: 4 }}>
                ₹1,26,000/mo
              </div>
              <div style={{ fontSize: 12.5, color: "#4E4B45", marginTop: 6, lineHeight: 1.45 }}>
                3 active commercial loans (₹28.1L total). AI advises collecting receivables before borrowing.
              </div>
            </div>
          </div>

          {/* Sub-panes: Market Candlestick & AI CFO Decision */}
          <div
            style={{
              marginTop: 20,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 20,
            }}
          >
            {/* Stock Trend Preview */}
            <div
              style={{
                background: "#FFFEFA",
                border: "1px solid #DCD6CA",
                borderRadius: 16,
                padding: "22px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <strong style={{ fontSize: 15, color: "#171717" }}>Reliance Industries (RELIANCE.NS)</strong>
                  <div style={{ fontSize: 12, color: "#77736B" }}>Live NSE Trend · SMA 20/50 & Volume Sub-Pane</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: "#171717" }}>₹1,358.40</span>
                  <span style={{ display: "block", fontSize: 11.5, color: "#B91C1C", fontWeight: 600 }}>-17.20 (-1.25%)</span>
                </div>
              </div>
              <div
                style={{
                  height: 120,
                  background: "#F5F1E8",
                  borderRadius: 10,
                  border: "1px solid #DCD6CA",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "14px",
                  textAlign: "center",
                  fontSize: 12.5,
                  color: "#4E4B45",
                }}
              >
                <div style={{ fontWeight: 700, color: "#171717", marginBottom: 4 }}>
                  📈 Professional Candlesticks & Technical Overlays
                </div>
                <div>
                  Helps business owners safely park surplus reserves into blue-chip Indian equities with virtual paper trading.
                </div>
              </div>
            </div>

            {/* AI Advisor Decision Box */}
            <div
              style={{
                background: "#171717",
                border: "1px solid #2D2D2D",
                borderRadius: 16,
                padding: "22px",
                color: "#F5F1E8",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ background: "#A58A62", color: "#171717", fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 4 }}>
                  AI CFO DECISION
                </span>
                <span style={{ fontSize: 12, color: "#C0BAAE" }}>
                  Question: "Can we take a ₹10,00,000 expansion loan?"
                </span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#FCA5A5", marginBottom: 6 }}>
                DECISION: DO NOT BORROW RIGHT NOW
              </div>
              <div style={{ fontSize: 12.5, color: "#D7D0C1", lineHeight: 1.55 }}>
                Your current monthly loan payment is already ₹1,26,000 across 3 loans. A new loan
                would push your cash runway down to 22 days.
                <br />
                <span style={{ color: "#86EFAC", fontWeight: 600 }}>
                  Recommended Action: Collect ₹6,61,953 in overdue customer receivables first.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section: Features ──────────────────────────────────────── */}
        <section className="landing-section" id="features">
          <div className="section-heading split-heading">
            <div>
              <span>WHAT CAN IT DO?</span>
              <h2>One platform.<br />Complete financial clarity.</h2>
            </div>
            <p>
              Purpose-built intelligence for understanding performance, protecting the business and
              planning what comes next.
            </p>
          </div>
          <div className="feature-grid">
            {features.map(([number, title, description]) => (
              <article className="feature-card" key={title}>
                <span className="feature-number">{number}</span>
                <div className="feature-icon" aria-hidden="true">↗</div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── Section: How It Works ──────────────────────────────────── */}
        <section className="landing-section how-section" id="how-it-works">
          <div className="section-heading">
            <span>HOW IT WORKS</span>
            <h2>From financial information to confident action.</h2>
          </div>
          <div className="steps-grid">
            <article>
              <b>01</b>
              <h3>Connect or upload</h3>
              <p>Add 20+ sheet Excel workbooks, invoices, or bank records to your workspace in 3 seconds.</p>
            </article>
            <article>
              <b>02</b>
              <h3>Let AI analyze</h3>
              <p>FinSight calculates loan capacity, profit margins, and flags cash leaks with verified citations.</p>
            </article>
            <article>
              <b>03</b>
              <h3>Act with clarity</h3>
              <p>Move What-If sliders to test decisions before spending money, and stay protected 24/7.</p>
            </article>
          </div>
        </section>

        {/* ── Section: Meet Your AI CFO (Interactive 300px Bot Tracker) ─ */}
        <section className="landing-section companion-section" id="about">
          <div className="companion-copy">
            <span>MEET YOUR AI CFO</span>
            <h2>A financial companion that helps you think forward.</h2>
            <p>
              Ask questions in plain language and work through complex financial decisions with a
              friendly, always-ready AI assistant that watches the numbers and follows your cursor.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="landing-primary" onClick={getStarted}>
                Try FinSight Free →
              </button>
              <button className="landing-secondary" onClick={() => setTourOpen(true)}>
                Explore Guided Tour 🎓
              </button>
            </div>
          </div>
          <div className="companion-visual">
            <AICFOAvatar size={300} expression="happy" label="FinSight AI CFO companion" />
          </div>
        </section>

        {/* ── Section: Why FinSight AI? ──────────────────────────────── */}
        <section className="landing-section why-section">
          <div className="section-heading">
            <span>WHY FINSIGHT AI?</span>
            <h2>Less complexity.<br />More visibility.</h2>
          </div>
          <div className="why-grid">
            <article>
              <strong>01</strong>
              <h3>Better visibility</h3>
              <p>See financial performance, debt burden, and runway priorities from one connected view.</p>
            </article>
            <article>
              <strong>02</strong>
              <h3>Smarter decisions</h3>
              <p>Use causal simulations and debt calculations to evaluate actions before committing money.</p>
            </article>
            <article>
              <strong>03</strong>
              <h3>Early risk warning</h3>
              <p>Spot duplicate vendor bills, billing spikes, and covenant risks weeks before they happen.</p>
            </article>
            <article>
              <strong>04</strong>
              <h3>Zero financial jargon</h3>
              <p>Move from dense financial formulas to plain-English guidance any business owner can act on.</p>
            </article>
          </div>
        </section>

        {/* ── Section: Call To Action ────────────────────────────────── */}
        <section className="landing-cta">
          <span>YOUR AI CFO IS READY</span>
          <h2>Make your next financial decision<br />with a clearer view.</h2>
          <button className="landing-primary" onClick={getStarted}>Get Started <span aria-hidden="true">→</span></button>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <button className="landing-brand" onClick={() => scrollToId("top")}>
          <span className="brand-mark">F</span>
          <span>FinSight <strong>AI</strong></span>
        </button>
        <p>AI-powered business financial intelligence.</p>
        <button onClick={() => navigate("/login")}>Sign In</button>
      </footer>

      {/* ── Guided Onboarding Walkthrough Modal ──────────────────────── */}
      <OnboardingModal forceOpen={tourOpen} onClose={() => setTourOpen(false)} />
    </div>
  );
}
