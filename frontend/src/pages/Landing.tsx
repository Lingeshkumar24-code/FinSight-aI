import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { AICFOAvatar } from "../components/ai/AICFOAvatar";
import { OnboardingModal } from "../components/onboarding/OnboardingModal";

interface FeatureItem {
  number: string;
  title: string;
  description: string;
  illustration: React.ReactNode;
}

interface WhyItem {
  number: string;
  title: string;
  description: string;
  illustration: React.ReactNode;
}

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

  const features: FeatureItem[] = [
    {
      number: "01",
      title: "Spreadsheet & Document Reader",
      description:
        "Upload messy 20+ sheet Excel workbooks, bank statements, or invoices. FinSight reads thousands of numbers in 3.4 seconds with 100% citation tracking — no complex formulas needed.",
      illustration: (
        <div className="feature-illustration">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#171717", display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ background: "#107C41", color: "#FFF", padding: "1px 4px", borderRadius: 3, fontSize: 8, fontWeight: 800 }}>XLSX</span>
              Consolidated_Financials.xlsx
            </span>
            <span style={{ fontSize: 8.5, background: "#ECFDF5", color: "#16845B", padding: "1px 6px", borderRadius: 4, fontWeight: 700, border: "1px solid #A7F3D0" }}>
              22 Sheets · 3.4s
            </span>
          </div>
          <div style={{ background: "#FFFFFF", border: "1px solid #E5DFD5", borderRadius: 6, padding: "6px 8px", fontSize: 9.5, fontFamily: "var(--font-mono, monospace)", color: "#171717", display: "grid", gap: 3.5, flex: 1, justifySelf: "stretch" }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #F4F1E8", paddingBottom: 2 }}>
              <span style={{ color: "#77736B" }}>Q3 Gross Revenue</span>
              <strong style={{ color: "#16845B" }}>₹1,42,85,000</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #F4F1E8", paddingBottom: 2 }}>
              <span style={{ color: "#77736B" }}>Cost of Goods (COGS)</span>
              <span>₹54,20,000</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#77736B" }}>Net Profit Margin</span>
              <strong style={{ color: "#16845B" }}>18.7% ✓</strong>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 6, fontSize: 8.5 }}>
            <span style={{ background: "#171717", color: "#FFF", padding: "2px 6px", borderRadius: 3, fontWeight: 700 }}>P&L (Live)</span>
            <span style={{ background: "#EAE5DA", color: "#4E4B45", padding: "2px 6px", borderRadius: 3 }}>Balance Sheet</span>
            <span style={{ background: "#EAE5DA", color: "#4E4B45", padding: "2px 6px", borderRadius: 3 }}>Bank Reco</span>
          </div>
        </div>
      ),
    },
    {
      number: "02",
      title: "Your 24/7 AI Chief Financial Officer",
      description:
        "Tells you clearly: Should you borrow from the bank or not? Calculates your monthly debt EMIs against real revenues so you never risk running out of cash.",
      illustration: (
        <div className="feature-illustration">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: "#B91C1C", display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#B91C1C", boxShadow: "0 0 0 2px rgba(185, 28, 28, 0.2)" }} />
              AI LOAN EVALUATION
            </span>
            <span style={{ fontSize: 8.5, background: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
              Decision: Hold
            </span>
          </div>
          <div style={{ background: "#171717", borderRadius: 6, padding: "8px 9px", color: "#F5F1E8", fontSize: 9.5, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ color: "#FCA5A5", fontWeight: 700, fontSize: 10, marginBottom: 2 }}>
              DO NOT BORROW RIGHT NOW
            </div>
            <div style={{ color: "#D7D0C1", fontSize: 9, lineHeight: 1.4 }}>
              Current monthly EMI: <strong>₹1,26,000/mo</strong>. A new loan drops runway to 22 days.
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 5, fontSize: 8.5, color: "#16845B", fontWeight: 700 }}>
            <span>✓ Collect ₹6.61L Overdue First</span>
            <span style={{ background: "#ECFDF5", padding: "1px 5px", borderRadius: 3 }}>Verified</span>
          </div>
        </div>
      ),
    },
    {
      number: "03",
      title: "Causal What-If Scenario Sliders",
      description:
        "What if sales drop 15% next quarter? What if supplier costs jump 8%? Move intuitive sliders to see your bank balance 12 months ahead before signing contracts or hiring.",
      illustration: (
        <div className="feature-illustration">
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, fontWeight: 700, color: "#171717", marginBottom: 5 }}>
            <span>Causal Simulator Console</span>
            <span style={{ color: "#16845B" }}>12-Mo Model</span>
          </div>
          <div style={{ display: "grid", gap: 7, background: "#FFFFFF", border: "1px solid #E5DFD5", borderRadius: 6, padding: "7px 8px", flex: 1 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#4E4B45", fontWeight: 600, marginBottom: 2 }}>
                <span>Sales Expansion Slider</span>
                <strong style={{ color: "#16845B" }}>+15%</strong>
              </div>
              <div style={{ height: 5, background: "#EAE5DA", borderRadius: 3, position: "relative" }}>
                <div style={{ width: "65%", height: "100%", background: "#16845B", borderRadius: 3 }} />
                <div style={{ position: "absolute", left: "63%", top: -3, width: 11, height: 11, borderRadius: "50%", background: "#171717", border: "2px solid #FFF", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </div>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#4E4B45", fontWeight: 600, marginBottom: 2 }}>
                <span>Supplier Cost Reduction</span>
                <strong style={{ color: "#16845B" }}>-5%</strong>
              </div>
              <div style={{ height: 5, background: "#EAE5DA", borderRadius: 3, position: "relative" }}>
                <div style={{ width: "35%", height: "100%", background: "#123B2A", borderRadius: 3 }} />
                <div style={{ position: "absolute", left: "33%", top: -3, width: 11, height: 11, borderRadius: "50%", background: "#171717", border: "2px solid #FFF", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 5, fontSize: 8.5 }}>
            <span style={{ color: "#77736B" }}>Ending Cash Result:</span>
            <strong style={{ color: "#16845B", fontWeight: 700 }}>₹38.4L (+₹14.9L Expansion)</strong>
          </div>
        </div>
      ),
    },
    {
      number: "04",
      title: "Stock Trends & Idle Cash Growth",
      description:
        "Don't let company cash sit idle losing value. Follow live NSE/BSE stock trends with moving averages and practice virtual paper trades with zero risk.",
      illustration: (
        <div className="feature-illustration">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#171717" }}>RELIANCE.NS (NSE)</span>
              <span style={{ fontSize: 8.5, color: "#77736B", marginLeft: 4 }}>Live Market</span>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: "#171717" }}>₹1,358.40</span>
              <span style={{ fontSize: 8.5, color: "#16845B", fontWeight: 700, marginLeft: 3 }}>▲ +1.2%</span>
            </div>
          </div>
          <div style={{ background: "#FFFFFF", border: "1px solid #E5DFD5", borderRadius: 6, padding: "4px 6px", flex: 1, display: "flex", alignItems: "center" }}>
            <svg width="100%" height="48" viewBox="0 0 200 48" fill="none" style={{ overflow: "visible" }}>
              <path d="M 0,38 Q 40,32 75,26 T 140,18 T 200,10" stroke="#2563EB" strokeWidth="1.5" fill="none" opacity="0.85" />
              <path d="M 0,42 Q 50,38 95,30 T 155,24 T 200,17" stroke="#D97706" strokeWidth="1.3" fill="none" opacity="0.8" />
              <line x1="20" y1="28" x2="20" y2="42" stroke="#16845B" strokeWidth="1" />
              <rect x="18" y="30" width="4" height="9" fill="#16845B" />
              <line x1="50" y1="20" x2="50" y2="34" stroke="#B91C1C" strokeWidth="1" />
              <rect x="48" y="22" width="4" height="9" fill="#B91C1C" />
              <line x1="85" y1="16" x2="85" y2="32" stroke="#16845B" strokeWidth="1" />
              <rect x="83" y="18" width="4" height="11" fill="#16845B" />
              <line x1="120" y1="12" x2="120" y2="28" stroke="#16845B" strokeWidth="1" />
              <rect x="118" y="14" width="4" height="11" fill="#16845B" />
              <line x1="155" y1="8" x2="155" y2="24" stroke="#16845B" strokeWidth="1" />
              <rect x="153" y="10" width="4" height="11" fill="#16845B" />
              <line x1="188" y1="4" x2="188" y2="18" stroke="#16845B" strokeWidth="1" />
              <rect x="186" y="6" width="4" height="10" fill="#16845B" />
            </svg>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8.5, color: "#77736B", marginTop: 4 }}>
            <span>SMA 20/50 Overlays</span>
            <span style={{ color: "#16845B", fontWeight: 700 }}>Paper Treasury Active</span>
          </div>
        </div>
      ),
    },
    {
      number: "05",
      title: "Automatic Fraud & Billing Shield",
      description:
        "Protects your bank accounts from billing mistakes, double payments, and supplier fraud. Automatically flags suspicious vendor invoices before money leaves.",
      illustration: (
        <div className="feature-illustration">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: "#B45309", display: "flex", alignItems: "center", gap: 4 }}>
              🛡️ Benford's Law Watchdog
            </span>
            <span style={{ fontSize: 8.5, background: "#FEF3C7", color: "#92400E", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
              1,420 Scanned
            </span>
          </div>
          <div style={{ background: "#FFFFFF", border: "1px solid #DCD6CA", borderRadius: 6, padding: "6px 8px", fontSize: 9, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#B91C1C", fontWeight: 700 }}>
              <span>⚠️ Split Invoice Detected</span>
              <span>₹49,500</span>
            </div>
            <div style={{ color: "#77736B", fontSize: 8.5, marginTop: 2, lineHeight: 1.35 }}>
              Vendor attempted bypass of ₹50k single-signoff approval threshold.
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8.5, color: "#16845B", marginTop: 5, fontWeight: 700 }}>
            <span>✓ Duplicate Invoice Guard</span>
            <span style={{ background: "#ECFDF5", padding: "1px 5px", borderRadius: 3 }}>Bank Protected</span>
          </div>
        </div>
      ),
    },
    {
      number: "06",
      title: "Cash Flow & Liquidity Runway",
      description:
        "Understand your exact financial cushion. Tracks opening balance, burn rate, and projected cash runway down to the day.",
      illustration: (
        <div className="feature-illustration">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
            <span style={{ fontSize: 9.5, color: "#77736B", fontWeight: 600 }}>Operating Cash Cushion</span>
            <strong style={{ fontSize: 13, color: "#171717" }}>45 Days Runway</strong>
          </div>
          <div style={{ background: "#FFFFFF", border: "1px solid #E5DFD5", borderRadius: 6, padding: "8px 9px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ height: 8, background: "#EAE5DA", borderRadius: 4, overflow: "hidden", display: "flex" }}>
              <div style={{ width: "65%", background: "#16845B" }} />
              <div style={{ width: "20%", background: "#F59E0B" }} />
              <div style={{ width: "15%", background: "#B91C1C" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8.5, color: "#77736B", marginTop: 6 }}>
              <span>Opening: <strong>₹23.5L</strong></span>
              <span>Burn: <strong>₹15.6L/mo</strong></span>
              <span style={{ color: "#16845B", fontWeight: 700 }}>Optimal</span>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8.5, color: "#16845B", marginTop: 4, fontWeight: 600 }}>
            <span>Safe Floor: ₹15,00,000</span>
            <span>Zero Deficit Projected</span>
          </div>
        </div>
      ),
    },
    {
      number: "07",
      title: "Capital Structure & Debt Capacity",
      description:
        "Review active business loans, monthly EMI commitments, interest rates, and financial stability from one unified perspective.",
      illustration: (
        <div className="feature-illustration">
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, fontWeight: 700, marginBottom: 4 }}>
            <span style={{ color: "#171717" }}>Leverage: Debt / Equity</span>
            <span style={{ color: "#16845B", background: "#ECFDF5", border: "1px solid #A7F3D0", padding: "1px 6px", borderRadius: 4 }}>
              0.539x (Low Risk)
            </span>
          </div>
          <div style={{ background: "#FFFFFF", border: "1px solid #DCD6CA", borderRadius: 6, padding: "5px 8px", fontSize: 8.5, display: "grid", gap: 2.5, flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#4E4B45" }}>1. Term Loan (HDFC)</span>
              <strong>₹12,00,000</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#4E4B45" }}>2. Working Cap (SBI)</span>
              <strong>₹9,00,000</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#4E4B45" }}>3. Machinery Lease</span>
              <strong>₹7,10,000</strong>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 8.5, marginTop: 4 }}>
            <span style={{ color: "#77736B" }}>Monthly Commitments:</span>
            <strong style={{ color: "#B91C1C", fontWeight: 700 }}>₹1,26,000/mo EMI</strong>
          </div>
        </div>
      ),
    },
    {
      number: "08",
      title: "24/7 Watchdog Alerts & Webhooks",
      description:
        "Never get surprised by an empty bank account or overdue bill. FinSight watches your numbers 24/7 and sends instant alerts when runway drops.",
      illustration: (
        <div className="feature-illustration">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: "#171717", display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#16845B", boxShadow: "0 0 0 3px rgba(22, 132, 91, 0.2)" }} />
              Active Daemon Scanner
            </span>
            <span style={{ fontSize: 8.5, color: "#77736B" }}>Pings every 2 min</span>
          </div>
          <div style={{ background: "#FFFFFF", border: "1px solid #DCD6CA", borderRadius: 6, padding: "6px 8px", fontSize: 9, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontWeight: 700, color: "#171717" }}>⚡ Webhook & Alert Dispatched</div>
            <div style={{ color: "#77736B", fontSize: 8.5, marginTop: 2, lineHeight: 1.35 }}>
              Receivables Watchdog: ₹6.61L Overdue &gt; 30 Days
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 5, fontSize: 8.5 }}>
            <span style={{ background: "#ECFDF5", color: "#16845B", padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>Email Sent</span>
            <span style={{ background: "#F4F1E8", color: "#4E4B45", padding: "1px 5px", borderRadius: 3 }}>n8n Webhook</span>
            <span style={{ background: "#F4F1E8", color: "#4E4B45", padding: "1px 5px", borderRadius: 3 }}>Slack Alert</span>
          </div>
        </div>
      ),
    },
  ];

  const whyItems: WhyItem[] = [
    {
      number: "01",
      title: "Better visibility",
      description: "See financial performance, debt burden, and runway priorities from one connected view.",
      illustration: (
        <div className="why-illustration">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: "#171717", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#16845B" }} />
              Unified Financial Radar
            </span>
            <span style={{ fontSize: 8.5, background: "#ECFDF5", color: "#16845B", padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>All Accounts Live</span>
          </div>
          <div style={{ background: "#FFFFFF", border: "1px solid #E5DFD5", borderRadius: 6, padding: "7px 8px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, textAlign: "center", flex: 1, alignItems: "center" }}>
            <div style={{ borderRight: "1px solid #F4F1E8", paddingRight: 2 }}>
              <div style={{ fontSize: 8, color: "#77736B" }}>Margin</div>
              <strong style={{ fontSize: 11, color: "#16845B" }}>18.7%</strong>
            </div>
            <div style={{ borderRight: "1px solid #F4F1E8", paddingRight: 2 }}>
              <div style={{ fontSize: 8, color: "#77736B" }}>Runway</div>
              <strong style={{ fontSize: 11, color: "#171717" }}>45 Days</strong>
            </div>
            <div>
              <div style={{ fontSize: 8, color: "#77736B" }}>Cash</div>
              <strong style={{ fontSize: 11, color: "#171717" }}>₹23.5L</strong>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8.5, color: "#77736B", marginTop: 4 }}>
            <span>HDFC · SBI · GST Portal</span>
            <span style={{ color: "#16845B", fontWeight: 700 }}>Zero Sync Delays</span>
          </div>
        </div>
      ),
    },
    {
      number: "02",
      title: "Smarter decisions",
      description: "Use causal simulations and debt calculations to evaluate actions before committing money.",
      illustration: (
        <div className="why-illustration">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: "#171717" }}>Causal Decision Matrix</span>
            <span style={{ fontSize: 8.5, background: "#FEF3C7", color: "#92400E", padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>Evaluation</span>
          </div>
          <div style={{ background: "#171717", borderRadius: 6, padding: "7px 9px", color: "#F5F1E8", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontSize: 8.5, color: "#C0BAAE", marginBottom: 2 }}>Question: "Hire 2 engineers this quarter?"</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#86EFAC" }}>
              ✓ APPROVED · CASH EXPANSION
            </div>
            <div style={{ fontSize: 8.5, color: "#EAE5DA", marginTop: 2 }}>
              Projected balance remains safe at <strong>₹28.4L</strong> with zero debt needed.
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8.5, color: "#16845B", marginTop: 4, fontWeight: 700 }}>
            <span>CFO Grounded Confidence</span>
            <span>99.2%</span>
          </div>
        </div>
      ),
    },
    {
      number: "03",
      title: "Early risk warning",
      description: "Spot duplicate vendor bills, billing spikes, and covenant risks weeks before they happen.",
      illustration: (
        <div className="why-illustration">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: "#B91C1C", display: "flex", alignItems: "center", gap: 4 }}>
              🛡️ Risk & Covenant Guard
            </span>
            <span style={{ fontSize: 8.5, background: "#FEF2F2", color: "#991B1B", padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>Active</span>
          </div>
          <div style={{ background: "#FFFFFF", border: "1px solid #E5DFD5", borderRadius: 6, padding: "6px 8px", fontSize: 8.5, display: "grid", gap: 3, flex: 1, justifySelf: "stretch" }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#16845B", fontWeight: 600 }}>
              <span>✓ Duplicate Vendor Bill</span>
              <span>Blocked (₹18.5k saved)</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#B45309", fontWeight: 600 }}>
              <span>⚠️ Split Invoice Detected</span>
              <span>₹49,500 Held</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#16845B", fontWeight: 600 }}>
              <span>✓ Safe Cash Floor</span>
              <span>Guarded &gt; ₹15L</span>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8.5, color: "#77736B", marginTop: 4 }}>
            <span>0 Breaches Detected</span>
            <span style={{ color: "#16845B", fontWeight: 700 }}>Bank Account Protected</span>
          </div>
        </div>
      ),
    },
    {
      number: "04",
      title: "Zero financial jargon",
      description: "Move from dense financial formulas to plain-English guidance any business owner can act on.",
      illustration: (
        <div className="why-illustration">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: "#171717" }}>Jargon-to-Plain English</span>
            <span style={{ fontSize: 8.5, background: "#ECFDF5", color: "#16845B", padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>100% Clear</span>
          </div>
          <div style={{ background: "#FFFFFF", border: "1px solid #E5DFD5", borderRadius: 6, padding: "6px 8px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ textDecoration: "line-through", color: "#9CA3AF", fontSize: 8.5, fontFamily: "var(--font-mono, monospace)" }}>
              "Current Ratio 2.196 & DSCR 1.84x"
            </div>
            <div style={{ fontSize: 9.5, fontWeight: 600, color: "#16845B", lineHeight: 1.35, marginTop: 2 }}>
              → "You own ₹2.20 in cash for every ₹1 in bills. You can safely pay all suppliers on time."
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8.5, color: "#77736B", marginTop: 4 }}>
            <span>Zero Complex Math</span>
            <span style={{ color: "#171717", fontWeight: 700 }}>Actionable Guidance</span>
          </div>
        </div>
      ),
    },
  ];

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

          {/* ── Enhanced Hero Preview Shell with Dynamic Business Graph ── */}
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

                  {/* ── Dynamic Multi-Layer Executive Financial Chart ── */}
                  <div className="preview-chart">
                    <div className="preview-chart-legend">
                      <span>● Cash Reserves (₹23.5L)</span>
                      <span style={{ color: "#D97706" }}>╌ Safe Floor (₹15L)</span>
                      <span style={{ color: "#16845B" }}>▲ +18.7% Margin</span>
                    </div>

                    <div style={{ flex: 1, padding: "8px 12px 6px 12px", position: "relative" }}>
                      <svg width="100%" height="100%" viewBox="0 0 380 145" preserveAspectRatio="none" style={{ overflow: "visible" }}>
                        <defs>
                          <linearGradient id="cash-area-glow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#16845B" stopOpacity="0.32" />
                            <stop offset="70%" stopColor="#16845B" stopOpacity="0.06" />
                            <stop offset="100%" stopColor="#16845B" stopOpacity="0" />
                          </linearGradient>
                          <linearGradient id="active-bar-grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#16845B" />
                            <stop offset="100%" stopColor="#123B2A" />
                          </linearGradient>
                          <linearGradient id="regular-bar-grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#374151" />
                            <stop offset="100%" stopColor="#1F2937" />
                          </linearGradient>
                        </defs>

                        {/* Subtle background gridlines */}
                        <line x1="0" y1="30" x2="380" y2="30" stroke="#E5DFD5" strokeDasharray="3 3" />
                        <line x1="0" y1="70" x2="380" y2="70" stroke="#E5DFD5" strokeDasharray="3 3" />
                        <line x1="0" y1="110" x2="380" y2="110" stroke="#E5DFD5" strokeDasharray="3 3" />

                        {/* Minimum Safe Buffer Line (₹15L) */}
                        <line x1="0" y1="78" x2="380" y2="78" stroke="#D97706" strokeWidth="1.2" strokeDasharray="4 4" />
                        <text x="375" y="74" fill="#D97706" fontSize="7.5" fontWeight="700" textAnchor="end">MIN SAFE BUFFER ₹15L</text>

                        {/* Financial Activity Monthly Bars */}
                        {/* Oct */}
                        <rect x="22" y="65" width="22" height="58" rx="3" fill="url(#regular-bar-grad)" opacity="0.8" />
                        {/* Nov */}
                        <rect x="74" y="52" width="22" height="71" rx="3" fill="url(#regular-bar-grad)" opacity="0.85" />
                        {/* Dec */}
                        <rect x="126" y="38" width="22" height="85" rx="3" fill="url(#regular-bar-grad)" opacity="0.9" />
                        {/* Jan */}
                        <rect x="178" y="58" width="22" height="65" rx="3" fill="url(#regular-bar-grad)" opacity="0.85" />
                        {/* Feb */}
                        <rect x="230" y="42" width="22" height="81" rx="3" fill="url(#regular-bar-grad)" opacity="0.9" />
                        {/* Mar (Live Peak) */}
                        <rect x="282" y="22" width="22" height="101" rx="3" fill="url(#active-bar-grad)" />
                        {/* Apr (AI Forecast) */}
                        <rect x="334" y="10" width="22" height="113" rx="3" fill="#ECFDF5" stroke="#16845B" strokeWidth="1.2" strokeDasharray="3 3" />

                        {/* Cash Trajectory Area Glow */}
                        <path
                          d="M 33,65 C 85,50 137,35 189,55 C 241,40 293,18 345,8 L 345,123 L 33,123 Z"
                          fill="url(#cash-area-glow)"
                        />

                        {/* Cash Trajectory Smooth Curve */}
                        <path
                          d="M 33,65 C 85,50 137,35 189,55 C 241,40 293,18 345,8"
                          stroke="#16845B"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          fill="none"
                        />

                        {/* Live Peak Beacon Point */}
                        <circle cx="293" cy="22" r="5" fill="#16845B" />
                        <circle cx="293" cy="22" r="8" fill="none" stroke="#16845B" strokeWidth="1.4" opacity="0.6">
                          <animate attributeName="r" values="5;11;5" dur="2s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
                        </circle>

                        {/* Peak Value Callout Tag */}
                        <g transform="translate(245, 2)">
                          <rect x="0" y="0" width="96" height="15" rx="4" fill="#171717" />
                          <text x="48" y="10.5" fill="#FAF7F2" fontSize="7.8" fontWeight="700" textAnchor="middle">
                            Mar Peak: ₹23,50,000
                          </text>
                        </g>

                        {/* Bottom Axis Baseline */}
                        <line x1="0" y1="123" x2="380" y2="123" stroke="#DCD6CA" strokeWidth="1" />

                        {/* Axis Month Labels */}
                        <text x="33" y="136" fill="#77736B" fontSize="8" fontWeight="600" textAnchor="middle">Oct</text>
                        <text x="85" y="136" fill="#77736B" fontSize="8" fontWeight="600" textAnchor="middle">Nov</text>
                        <text x="137" y="136" fill="#77736B" fontSize="8" fontWeight="600" textAnchor="middle">Dec</text>
                        <text x="189" y="136" fill="#77736B" fontSize="8" fontWeight="600" textAnchor="middle">Jan</text>
                        <text x="241" y="136" fill="#77736B" fontSize="8" fontWeight="600" textAnchor="middle">Feb</text>
                        <text x="293" y="136" fill="#16845B" fontSize="8.2" fontWeight="800" textAnchor="middle">Mar (Live)</text>
                        <text x="345" y="136" fill="#2563EB" fontSize="8" fontWeight="700" textAnchor="middle">Apr (AI)</text>
                      </svg>
                    </div>
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

        {/* ── Section: 8 Features with Business Illustrations ────────── */}
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
            {features.map((item) => (
              <article className="feature-card" key={item.title}>
                {item.illustration}
                <div className="feature-card-content">
                  <div className="feature-card-header">
                    <span className="feature-number">{item.number}</span>
                    <div className="feature-icon" aria-hidden="true">↗</div>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
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
            <article style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <b>01</b>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#16845B", background: "rgba(22, 132, 91, 0.15)", padding: "2px 8px", borderRadius: 12, border: "1px solid rgba(22, 132, 91, 0.3)" }}>
                  ⚡ 3.4s Rapid Ingest
                </span>
              </div>
              <div style={{ background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 12, padding: "14px 16px", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 24 }}>📂</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#F5F1E8" }}>Multi-Sheet Reader</div>
                    <div style={{ fontSize: 11, color: "#8E887E" }}>XLSX · CSV · DOCX · PDF</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, background: "rgba(245, 241, 232, 0.08)", color: "#C0BAAE", padding: "2px 6px", borderRadius: 4 }}>Balance Sheet</span>
                  <span style={{ fontSize: 10, background: "rgba(245, 241, 232, 0.08)", color: "#C0BAAE", padding: "2px 6px", borderRadius: 4 }}>Annual P&amp;L</span>
                  <span style={{ fontSize: 10, background: "rgba(245, 241, 232, 0.08)", color: "#C0BAAE", padding: "2px 6px", borderRadius: 4 }}>Invoices</span>
                </div>
              </div>
              <h3 style={{ margin: "0 0 10px 0" }}>Connect or upload</h3>
              <p style={{ margin: 0 }}>Add 20+ sheet Excel workbooks, invoices, or bank records to your workspace in 3 seconds.</p>
            </article>

            <article style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <b>02</b>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#3B82F6", background: "rgba(59, 130, 246, 0.15)", padding: "2px 8px", borderRadius: 12, border: "1px solid rgba(59, 130, 246, 0.3)" }}>
                  🧠 Multi-Agent RAG
                </span>
              </div>
              <div style={{ background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 12, padding: "14px 16px", marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 20 }}>📊</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#F5F1E8" }}>Financial Deliberation</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#10B981" }}>+37.2% Margin</span>
                </div>
                <div style={{ fontSize: 11, color: "#8E887E", display: "flex", justifyContent: "space-between" }}>
                  <span>Debt Capacity: ₹30,00,000</span>
                  <span style={{ color: "#3B82F6", fontWeight: 600 }}>100% Verified Citations</span>
                </div>
              </div>
              <h3 style={{ margin: "0 0 10px 0" }}>Let AI analyze</h3>
              <p style={{ margin: 0 }}>FinSight calculates loan capacity, profit margins, and flags cash leaks with verified citations.</p>
            </article>

            <article style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <b>03</b>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#10B981", background: "rgba(16, 185, 129, 0.15)", padding: "2px 8px", borderRadius: 12, border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                  🛡️ 24/7 Watchdog
                </span>
              </div>
              <div style={{ background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 12, padding: "14px 16px", marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 20 }}>🎚️</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#F5F1E8" }}>Causal What-If Levers</span>
                  </div>
                  <span style={{ fontSize: 10, background: "rgba(16, 185, 129, 0.2)", color: "#10B981", padding: "1px 6px", borderRadius: 4 }}>Zero Risk</span>
                </div>
                <div style={{ fontSize: 11, color: "#8E887E", display: "flex", justifyContent: "space-between" }}>
                  <span>Runway Simulation: 12 Mo</span>
                  <span style={{ color: "#F59E0B", fontWeight: 600 }}>Instant Webhooks</span>
                </div>
              </div>
              <h3 style={{ margin: "0 0 10px 0" }}>Act with clarity</h3>
              <p style={{ margin: 0 }}>Move What-If sliders to test decisions before spending money, and stay protected 24/7.</p>
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
            {whyItems.map((item) => (
              <article key={item.title}>
                {item.illustration}
                <div className="why-card-content">
                  <div className="why-card-header">
                    <strong>{item.number}</strong>
                    <span style={{ fontSize: 9.5, color: "#16845B", fontWeight: 700, background: "#ECFDF5", border: "1px solid #A7F3D0", padding: "1px 6px", borderRadius: 4 }}>
                      Verified
                    </span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
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
      <footer
        className="landing-footer"
        style={{
          borderTop: "1px solid #DCD6CA",
          background: "#FFFEFA",
          padding: "54px 5vw 36px",
          display: "flex",
          flexDirection: "column",
          gap: 32,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 36,
            width: "100%",
          }}
        >
          {/* Col 1: Brand & Overview */}
          <div>
            <button className="landing-brand" onClick={() => scrollToId("top")} style={{ marginBottom: 12 }}>
              <span className="brand-mark">F</span>
              <span>FinSight <strong>AI</strong></span>
            </button>
            <p style={{ color: "#77736B", fontSize: 13, lineHeight: 1.6, margin: "0 0 14px 0" }}>
              Enterprise business financial intelligence, multi-agent RAG deliberation, and deterministic cash flow risk engine.
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, background: "#F5F1E8", color: "#16845B", padding: "4px 10px", borderRadius: 6, fontWeight: 700 }}>
              <span>🛡️ SOC 2 &amp; ISO 27001 Ready Architecture</span>
            </div>
          </div>

          {/* Col 2: Platform Navigation */}
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: "#171717", letterSpacing: "0.08em", marginBottom: 14 }}>
              PLATFORM
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
              <button onClick={() => scrollToId("platform")} style={{ textAlign: "left", padding: 0 }}>Overview &amp; Architecture</button>
              <button onClick={() => scrollToId("preview")} style={{ textAlign: "left", padding: 0 }}>Live Financial Dashboard</button>
              <button onClick={() => scrollToId("features")} style={{ textAlign: "left", padding: 0 }}>Modular Risk Tools</button>
              <button onClick={() => scrollToId("how-it-works")} style={{ textAlign: "left", padding: 0 }}>Getting Started Guide</button>
              <button onClick={() => setTourOpen(true)} style={{ textAlign: "left", padding: 0, color: "#2563EB", fontWeight: 600 }}>🎓 Launch Product Tour</button>
            </div>
          </div>

          {/* Col 3: Intelligence & Capabilities */}
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: "#171717", letterSpacing: "0.08em", marginBottom: 14 }}>
              CAPABILITIES
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "#77736B" }}>
              <span>• Multi-Agent RAG Financial Deliberation</span>
              <span>• Causal What-If Scenario Simulator</span>
              <span>• Benford's Law Vendor Fraud Shield</span>
              <span>• Indian Stock Market Analysis (NSE / BSE)</span>
              <span>• Paper Trading &amp; Idle Cash Treasury</span>
            </div>
          </div>

          {/* Col 4: Licensing & Legal Disclosures */}
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: "#171717", letterSpacing: "0.08em", marginBottom: 14 }}>
              LICENSE &amp; COPYRIGHT
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5, color: "#77736B", lineHeight: 1.55 }}>
              <div>
                <strong style={{ color: "#171717" }}>Apache License 2.0</strong>
                <div>Open Core Community Distribution &amp; Commercial Enterprise Edition.</div>
              </div>
              <div style={{ marginTop: 4 }}>
                <strong style={{ color: "#171717" }}>SEBI / SEC Disclaimer</strong>
                <div style={{ fontSize: 11.5, color: "#8E887E" }}>
                  Deterministic mathematical models over verified filings. Not registered financial investment advice.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright, Terms & Sign In */}
        <div
          style={{
            borderTop: "1px solid #ECE7DE",
            paddingTop: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
            fontSize: 12,
            color: "#8E887E",
            width: "100%",
          }}
        >
          <div>
            © 2026 FinSight AI Inc. All rights reserved. Registered under Apache 2.0 &amp; Enterprise License.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Security Architecture</span>
            <button
              onClick={() => navigate("/login")}
              className="btn btn-primary btn-sm"
              style={{
                borderRadius: 8,
                padding: "6px 16px",
                fontSize: 12.5,
              }}
            >
              Sign In to Portal →
            </button>
          </div>
        </div>
      </footer>

      {/* ── Guided Onboarding Walkthrough Modal ──────────────────────── */}
      <OnboardingModal forceOpen={tourOpen} onClose={() => setTourOpen(false)} />
    </div>
  );
}
