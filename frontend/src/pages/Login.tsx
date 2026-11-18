import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { Card } from "../components/ui/Card";

export function Login() {
  const { login, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("owner@example.com");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch {
      // error handled in context
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--paper)",
        padding: "24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              borderRadius: 8,
              background: "#0A0A0A",
              color: "#FFFFFF",
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: "0.05em",
              marginBottom: 12,
            }}
          >
            FS
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
            FinSight AI
          </h1>
          <p style={{ color: "var(--ink-muted)", fontSize: 13, margin: 0 }}>
            Executive Business Financial Intelligence
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 18 }}>
              <label htmlFor="email">Executive Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
              />
            </div>
            <div style={{ marginBottom: 22 }}>
              <label htmlFor="password">Security Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && <p className="error-text" style={{ marginBottom: 14 }}>{error}</p>}
            <button
              className="btn btn-primary"
              type="submit"
              disabled={submitting}
              style={{ width: "100%", padding: "11px 18px", fontSize: "14px" }}
            >
              {submitting ? "Authenticating…" : "Sign In to Portal"}
            </button>
          </form>
        </Card>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <p style={{ color: "var(--ink-muted)", fontSize: 12, margin: 0 }}>
            Demo Authentication Enabled · Any password accepted
          </p>
        </div>
      </div>
    </div>
  );
}
