import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { AICFOAvatar, type AssistantExpression } from "../components/ai/AICFOAvatar";

type Phase = "idle" | "typing" | "submitting" | "success" | "error";

const BUBBLE: Record<Phase, string> = {
  idle: "Hi! I'm your AI CFO. Sign in or use email verification to access your portal.",
  typing: "Nice. Take your time — I'm right here.",
  submitting: "Checking your credentials…",
  success: "Welcome back! Loading your dashboard.",
  error: "Hmm, that didn't work. Check the details and try again.",
};

const EXPRESSION: Record<Phase, AssistantExpression> = {
  idle: "neutral",
  typing: "happy",
  submitting: "loading",
  success: "success",
  error: "error",
};

export function Login() {
  const { login, register, sendOtp, loginWithOtp, resetPassword, error, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const initialMode =
    params.get("mode") === "register"
      ? "register"
      : params.get("mode") === "otp"
        ? "otp"
        : params.get("mode") === "forgot"
          ? "forgot"
          : "login";

  const [mode, setMode] = useState<"login" | "otp" | "register" | "forgot">(initialMode);
  const [email, setEmail] = useState("owner@example.com");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [devOtpNotice, setDevOtpNotice] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [shakeKey, setShakeKey] = useState(0);

  useEffect(() => {
    if (isAuthenticated) navigate("/upload", { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (phase === "success") {
      const timer = window.setTimeout(() => navigate("/upload"), 700);
      return () => window.clearTimeout(timer);
    }
  }, [phase, navigate]);

  // Cooldown timer for OTP resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setInterval(() => {
      setCooldown((c) => (c > 1 ? c - 1 : 0));
    }, 1000);
    return () => window.clearInterval(t);
  }, [cooldown]);

  async function handleSendOtp(purpose: "login" | "reset" = "login") {
    if (!email || !email.includes("@")) {
      setPhase("error");
      setShakeKey((k) => k + 1);
      return;
    }
    setPhase("submitting");
    try {
      const res = await sendOtp(email, purpose);
      setOtpSent(true);
      setCooldown(30);
      setPhase("idle");
      setInfoMessage(`Verification code sent to ${email} via Resend.`);
      if (res.dev_otp) {
        setDevOtpNotice(`Dev code: ${res.dev_otp}`);
      }
    } catch {
      setPhase("error");
      setShakeKey((k) => k + 1);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (phase === "submitting" || phase === "success") return;

    setPhase("submitting");
    setInfoMessage(null);

    try {
      if (mode === "register") {
        await register(email, password, fullName);
      } else if (mode === "login") {
        await login(email, password);
      } else if (mode === "otp") {
        if (!otpSent) {
          await handleSendOtp("login");
          return;
        }
        await loginWithOtp(email, otp, fullName);
      } else if (mode === "forgot") {
        if (!otpSent) {
          await handleSendOtp("reset");
          return;
        }
        await resetPassword(email, otp, password);
        // Automatically login with the updated password
        await login(email, password);
      }
      setPhase("success");
    } catch {
      setPhase("error");
      setShakeKey((k) => k + 1);
    }
  }

  const busy = phase === "submitting" || phase === "success";

  return (
    <div className="auth-shell">
      <section className="auth-hero" aria-label="FinSight AI introduction">
        <span className="auth-orb o1" aria-hidden="true" />
        <span className="auth-orb o2" aria-hidden="true" />
        <span className="auth-orb o3" aria-hidden="true" />
        <AICFOAvatar size={190} expression={EXPRESSION[phase]} label="FinSight AI robot" />
        <div className="auth-bubble" role="status" aria-live="polite">
          {BUBBLE[phase]}
        </div>
        <h2>Your Intelligent CFO</h2>
        <p>Analyze, predict, protect and optimize your business finances — with verified figures.</p>
        <div className="auth-chips" aria-hidden="true">
          <span>Forecasts</span>
          <span>Fraud checks</span>
          <span>What-if simulator</span>
          <span>Paper trading</span>
        </div>
      </section>

      <section className="auth-panel">
        <div className={`auth-card${shakeKey && phase === "error" ? " is-shaking" : ""}`} key={shakeKey}>
          <h1>FinSight AI</h1>
          <p className="page-lead">Executive Business Financial Intelligence</p>

          {mode !== "forgot" && (
            <div className="auth-tabs" role="tablist" aria-label="Authentication options">
              <button
                type="button"
                className={mode === "login" ? "active" : ""}
                onClick={() => {
                  setMode("login");
                  setParams({ mode: "login" });
                  setPhase("idle");
                  setInfoMessage(null);
                }}
              >
                Password
              </button>
              <button
                type="button"
                className={mode === "otp" ? "active" : ""}
                onClick={() => {
                  setMode("otp");
                  setParams({ mode: "otp" });
                  setPhase("idle");
                  setInfoMessage(null);
                }}
              >
                Email OTP
              </button>
              <button
                type="button"
                className={mode === "register" ? "active" : ""}
                onClick={() => {
                  setMode("register");
                  setParams({ mode: "register" });
                  setPhase("idle");
                  setInfoMessage(null);
                }}
              >
                Create Account
              </button>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "register" && (
              <div className="field">
                <label htmlFor="fullName">Full Name</label>
                <input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                  required
                />
              </div>
            )}

            <div className="field">
              <label htmlFor="email">
                {mode === "forgot" ? "Account Email for Recovery" : "Executive Email"}
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setPhase("typing");
                  }}
                  onFocus={() => phase === "idle" && setPhase("typing")}
                  placeholder="name@company.com"
                  autoComplete="email"
                  required
                  style={{ flex: 1 }}
                />
                {(mode === "otp" || mode === "forgot") && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleSendOtp(mode === "forgot" ? "reset" : "login")}
                    disabled={busy || cooldown > 0 || !email.includes("@")}
                    style={{ whiteSpace: "nowrap", minWidth: "105px", fontSize: "13px" }}
                  >
                    {cooldown > 0 ? `${cooldown}s wait` : otpSent ? "Resend Code" : "Send Code"}
                  </button>
                )}
              </div>
            </div>

            {/* OTP Code Input */}
            {(mode === "otp" || (mode === "forgot" && otpSent)) && (
              <div className="field">
                <label htmlFor="otp">
                  6-Digit Verification Code {devOtpNotice && <span style={{ color: "#2563eb", fontWeight: 600 }}>({devOtpNotice})</span>}
                </label>
                <input
                  id="otp"
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setPhase("typing");
                  }}
                  placeholder="123456"
                  autoComplete="one-time-code"
                  style={{ letterSpacing: "4px", fontSize: "18px", fontWeight: 700, textAlign: "center" }}
                  required
                />
              </div>
            )}

            {/* Password Field (for login, register, and reset) */}
            {mode !== "otp" && (
              <div className="field">
                <label htmlFor="password">
                  {mode === "forgot" ? "New Security Password" : "Security Password"}
                </label>
                <input
                  id="password"
                  className="has-reveal"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPhase("typing");
                  }}
                  placeholder="••••••••"
                  autoComplete={mode === "forgot" ? "new-password" : "current-password"}
                  required
                />
                <button
                  type="button"
                  className="reveal"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            )}

            {phase === "error" && error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}

            {infoMessage && <p className="auth-success">{infoMessage}</p>}
            {phase === "success" && <p className="auth-success">Signed in successfully. Launching portal…</p>}

            <button
              className={`btn btn-primary btn-lg${phase === "submitting" ? " is-loading" : ""}`}
              type="submit"
              disabled={busy}
              style={{ width: "100%" }}
            >
              {phase === "submitting"
                ? "Authenticating…"
                : mode === "register"
                  ? "Create Account"
                  : mode === "otp"
                    ? otpSent
                      ? "Verify & Sign In"
                      : "Send Verification Code"
                    : mode === "forgot"
                      ? otpSent
                        ? "Reset Password & Sign In"
                        : "Send Recovery Code"
                      : phase === "success"
                        ? "Welcome!"
                        : "Sign In to Portal"}
            </button>

            {mode !== "forgot" ? (
              <button
                type="button"
                className="auth-link"
                onClick={() => {
                  setMode("forgot");
                  setParams({ mode: "forgot" });
                  setOtpSent(false);
                  setInfoMessage(null);
                  setDevOtpNotice(null);
                }}
              >
                Forgot Password?
              </button>
            ) : (
              <button
                type="button"
                className="auth-link"
                onClick={() => {
                  setMode("login");
                  setParams({ mode: "login" });
                  setOtpSent(false);
                  setInfoMessage(null);
                  setDevOtpNotice(null);
                }}
              >
                Back to Login
              </button>
            )}
          </form>

          <p className="auth-note">
            Resend API Email Verification · Enterprise PBKDF2-HMAC Authentication · Instant demo via owner@example.com
          </p>
        </div>
      </section>
    </div>
  );
}
