import { useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import { Card } from "../components/ui/Card";

export function Reports() {
  const [businessName, setBusinessName] = useState("Acme Global Holdings");
  const [period, setPeriod] = useState("2026-Q3");
  const [notes, setNotes] = useState("Consolidated executive briefing covering liquidity ratios, debt structure, and projected cash flows.");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setError(null);
    setDone(false);
    try {
      const blob = await api.generateReport({
        business_name: businessName,
        period,
        ratios: [],
        notes,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${businessName.replace(/\s+/g, "_")}_${period}_report.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Report generation failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1>Executive PDF Reports</h1>
        <p className="page-lead">
          Compile certified, board-ready financial intelligence dossiers with ratio benchmarks and audit commentary.
        </p>
      </div>

      <Card>
        <div className="section-header">
          <h2>Report Configuration</h2>
          <span className="section-run">Standard Audit Dossier</span>
        </div>
        <form onSubmit={handleSubmit} style={{ marginTop: 14 }}>
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="biz">Entity Name</label>
            <input id="biz" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="period">Reporting Period</label>
            <input id="period" value={period} onChange={(e) => setPeriod(e.target.value)} required />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label htmlFor="notes">Executive Commentary & Notes</label>
            <textarea id="notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={generating} style={{ width: "100%" }}>
            {generating ? "Compiling Dossier…" : "Generate PDF"}
          </button>
          {error && <p className="error-text">{error}</p>}
          {done && (
            <div style={{ marginTop: 14, padding: "10px 12px", background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "var(--radius-soft)", color: "#047857", fontSize: 13, fontWeight: 600 }}>
              ✓ Report generated and downloaded successfully.
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}
