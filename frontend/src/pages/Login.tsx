import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { AICFOAvatar } from "../components/ai/AICFOAvatar";

export function Login() {
  const { login, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("owner@example.com");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch {
      // error handled in auth context
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        width: "100%",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* ── Left Hero Side (Dark Cosmic Robot with Eye Tracking) ─────── */}
      <div
        style={{
          flex: "1 1 50%",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 32px",
          background: "linear-gradient(135deg, #090B1E 0%, #111438 50%, #0B0E23 100%)",
          overflow: "hidden",
        }}
      >
        {/* Glowing Decorative Blurred Orbs */}
        <div
          style={{
            position: "absolute",
            top: "14%",
            right: "18%",
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(236, 72, 153, 0.35) 0%, rgba(236, 72, 153, 0) 70%)",
            filter: "blur(40px)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "16%",
            left: "12%",
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(56, 189, 248, 0.32) 0%, rgba(56, 189, 248, 0) 70%)",
            filter: "blur(45px)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "40%",
            right: "12%",
            width: 140,
            height: 140,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(147, 51, 234, 0.28) 0%, rgba(147, 51, 234, 0) 70%)",
            filter: "blur(35px)",
            pointerEvents: "none",
          }}
        />

        {/* Content Container */}
        <div
          style={{
            position: "relative",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            maxWidth: 480,
            textAlign: "center",
          }}
        >
          {/* Eye-Tracking Robot Avatar */}
          <div style={{ marginBottom: 12 }}>
            <AICFOAvatar
              size={170}
              expression="happy"
              coveringEyes={isPasswordFocused}
            />
          </div>

          {/* Speech Bubble Pill */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              border: "1px solid rgba(255, 255, 255, 0.16)",
              borderRadius: 9999,
              padding: "10px 22px",
              color: "#FFFFFF",
              fontSize: 13.5,
              fontWeight: 500,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
              marginBottom: 24,
            }}
          >
            Hi! I'm your AI CFO. Sign in and let's look at your numbers.
          </div>

          {/* Main Title */}
          <h1
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "#FFFFFF",
              margin: "0 0 10px 0",
              letterSpacing: "-0.02em",
            }}
          >
            Your Intelligent CFO
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: 14.5,
              color: "#94A3B8",
              margin: "0 0 32px 0",
              lineHeight: 1.5,
              maxWidth: 420,
            }}
          >
            Analyze, predict, protect and optimize your business finances — with verified figures.
          </p>

          {/* Feature Pills */}
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10 }}>
            {["Forecasts", "Fraud checks", "What-If simulator", "Paper trading"].map((pill) => (
              <span
                key={pill}
                style={{
                  background: "rgba(255, 255, 255, 0.07)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  border: "1px solid rgba(255, 255, 255, 0.14)",
                  borderRadius: 9999,
                  padding: "7px 18px",
                  color: "#E2E8F0",
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                }}
              >
                {pill}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Form Side (Clean White Sign-In Card) ────────────────── */}
      <div
        style={{
          flex: "1 1 50%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 32px",
          background: "#FFFFFF",
        }}
      >
        <div style={{ width: "100%", maxWidth: 390 }}>
          {/* Back to Product Overview */}
          <Link
            to="/overview"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12.5,
              fontWeight: 600,
              color: "#2563EB",
              textDecoration: "none",
              marginBottom: 16,
            }}
          >
            ← Explore Product Overview
          </Link>

          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <h2
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "#0F172A",
                margin: "0 0 6px 0",
                letterSpacing: "-0.02em",
              }}
            >
              FinSight AI
            </h2>
            <p style={{ fontSize: 13.5, color: "#64748B", margin: 0, fontWeight: 500 }}>
              Executive Business Financial Intelligence
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Email Field */}
            <div style={{ marginBottom: 20 }}>
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#475569",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                EXECUTIVE EMAIL
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@example.com"
                required
                style={{
                  width: "100%",
                  height: 48,
                  padding: "0 16px",
                  fontSize: 14,
                  borderRadius: 10,
                  border: "1px solid #E2E8F0",
                  background: "#FFFFFF",
                  color: "#0F172A",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#6366F1";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.15)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#E2E8F0";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Password Field with Show/Hide toggle */}
            <div style={{ marginBottom: 24 }}>
              <label
                htmlFor="password"
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#475569",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                SECURITY PASSWORD
              </label>
              <div style={{ position: "relative", width: "100%" }}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={(e) => {
                    setIsPasswordFocused(true);
                    e.currentTarget.style.borderColor = "#6366F1";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.15)";
                  }}
                  onBlur={(e) => {
                    setIsPasswordFocused(false);
                    e.currentTarget.style.borderColor = "#E2E8F0";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  placeholder="••••••••"
                  required
                  style={{
                    width: "100%",
                    height: 48,
                    padding: "0 54px 0 16px",
                    fontSize: 14,
                    borderRadius: 10,
                    border: "1px solid #E2E8F0",
                    background: "#FFFFFF",
                    color: "#0F172A",
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    padding: 0,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#6366F1",
                    cursor: "pointer",
                  }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <p style={{ color: "#DC2626", fontSize: 13, margin: "0 0 16px 0", fontWeight: 500 }}>
                {error}
              </p>
            )}

            {/* Gradient Sign In Button */}
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: "100%",
                height: 48,
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(135deg, #6366F1 0%, #38BDF8 100%)",
                color: "#FFFFFF",
                fontSize: 15,
                fontWeight: 600,
                cursor: submitting ? "not-allowed" : "pointer",
                boxShadow: "0 4px 14px rgba(99, 102, 241, 0.35)",
                transition: "opacity 0.2s, transform 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!submitting) e.currentTarget.style.opacity = "0.94";
              }}
              onMouseLeave={(e) => {
                if (!submitting) e.currentTarget.style.opacity = "1";
              }}
            >
              {submitting ? "Signing In…" : "Sign In to Portal"}
            </button>
          </form>

          {/* Subtext */}
          <div style={{ textAlign: "center", marginTop: 22 }}>
            <p style={{ fontSize: 12, color: "#94A3B8", margin: 0 }}>
              Demo Authentication Enabled · Any password accepted
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
