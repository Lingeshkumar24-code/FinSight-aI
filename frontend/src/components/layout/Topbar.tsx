import { useAuth } from "../../lib/AuthContext";

export function Topbar() {
  const { businessId, logout } = useAuth();
  return (
    <header className="topbar">
      <div className="topbar-title">
        <span style={{ color: "var(--ink-muted)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
          Organization
        </span>
        <div className="tenant-pill">
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#047857" }} />
          <span>{businessId ?? "Acme Global Holdings"}</span>
        </div>
      </div>
      <div className="topbar-aligned">
        <span style={{ fontSize: "12px", color: "var(--ink-muted)", fontWeight: 500 }}>
          Fiscal Q3 · Real-Time Sync
        </span>
        <button className="btn btn-secondary" onClick={logout}>
          Sign out
        </button>
      </div>
    </header>
  );
}
