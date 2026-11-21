import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, ApiError, type DashboardSummary } from "../lib/api";
import { Card } from "../components/ui/Card";

type FinancialRecord = Record<string, unknown> & { period?: string };

function value(record: FinancialRecord | undefined, field: string): number | null {
  if (!record) return null;
  const n = Number(record[field]);
  return record[field] === null || record[field] === undefined || !Number.isFinite(n) ? null : n;
}

function amount(record: FinancialRecord | undefined, field: string): string {
  const n = value(record, field);
  return n === null ? "Not reported" : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function Reports() {
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [loadingDash, setLoadingDash] = useState(true);
  const [period, setPeriod] = useState("");
  const [notes, setNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.getDashboard().then((data) => {
      if (cancelled) return;
      setDashboard(data);
      const availablePeriods = (data.records ?? []).map((record) => String(record.period ?? "")).filter(Boolean);
      setPeriod(availablePeriods[availablePeriods.length - 1] ?? data.period ?? "");
    }).catch(() => {
      if (!cancelled) setDashboard(null);
    }).finally(() => {
      if (!cancelled) setLoadingDash(false);
    });
    return () => { cancelled = true; };
  }, []);

  const records = (dashboard?.records ?? []) as FinancialRecord[];
  const periods = [...new Set(records.map((record) => String(record.period ?? "")).filter(Boolean))];
  const selectedIndex = records.findIndex((record) => record.period === period);
  const selected = selectedIndex >= 0 ? records[selectedIndex] : undefined;
  const previous = selectedIndex > 0 ? records[selectedIndex - 1] : undefined;
  const hasData = Boolean(dashboard?.available && selected);
  const ratios = useMemo(() => dashboard?.ratios_by_period?.[period] ?? [], [dashboard, period]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!hasData) return;
    setGenerating(true);
    setError(null);
    setDone(false);
    try {
      const blob = await api.generateReport({
        period,
        notes,
        // Older local API versions still require this field. The current API
        // takes the entity name and financial metrics directly from the DB.
        business_name: dashboard?.company_name || "Business workspace",
        ratios,
        risk: period === dashboard?.period ? dashboard?.risk : undefined,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${(dashboard?.company_name || "business").replace(/\s+/g, "_")}_${period}_financial_report.pdf`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Report generation failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div style={{ maxWidth: 820, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1>Financial Reports</h1>
        <p className="page-lead">Generate a management report with financial statements, period comparisons, calculated ratios, risk indicators, and data-source notes.</p>
      </div>

      {!loadingDash && !hasData && (
        <div role="status" style={{ padding: "14px 16px", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 8, color: "#92400E", fontSize: 13.5 }}>
          Upload and process financial statement data before generating a report. A report is available only for periods saved in this workspace.
        </div>
      )}

      {hasData && selected && (
        <Card>
          <div className="section-header">
            <h2>Report preview</h2>
            <span className="section-run">{dashboard?.company_name || "Business workspace"} · {period}</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
            The PDF includes an executive summary, financial statement details, comparison with {previous?.period ?? "the previous period (when available)"}, ratio analysis, rule-based risk review, source and verification status, and methodology limitations.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginTop: 14 }}>
            {[["Revenue", "revenue"], ["Net income", "net_income"], ["Total assets", "total_assets"], ["Total liabilities", "total_liabilities"], ["Equity", "total_equity"], ["Cash / closing cash", selected.closing_cash !== null && selected.closing_cash !== undefined ? "closing_cash" : "cash"]].map(([label, field]) => (
              <div key={field} style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface-raised)" }}>
                <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>{label}</div>
                <strong style={{ fontSize: 14 }}>{amount(selected, field)}</strong>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 12 }}>
            Source: {String(selected.source ?? "workspace record")} · Workspace verification: {selected.verified ? "marked verified" : "not marked verified"} · {ratios.length} calculated ratios
          </p>
          {ratios.length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600 }}>View ratio preview</summary>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 7, marginTop: 10 }}>
                {ratios.map((ratio) => <div key={ratio.name} style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }}><strong>{ratio.name.replace(/_/g, " ")}</strong>: {ratio.value === null || ratio.value === undefined ? "Not available" : ratio.value}</div>)}
              </div>
            </details>
          )}
        </Card>
      )}

      <Card>
        <div className="section-header">
          <h2>Report configuration</h2>
          <span className="section-run">Management report</span>
        </div>
        <form onSubmit={handleSubmit} style={{ marginTop: 14 }}>
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="period">Reporting period</label>
            <select id="period" value={period} onChange={(e) => setPeriod(e.target.value)} required disabled={periods.length === 0} style={{ width: "100%" }}>
              {periods.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 18 }}>
            <label htmlFor="notes">Optional management commentary</label>
            <textarea id="notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add context for readers, such as significant events or management explanations. This text is included as provided." />
          </div>
          <button className="btn btn-primary" type="submit" disabled={generating || loadingDash || !hasData} style={{ width: "100%" }}>
            {generating ? "Generating report…" : "Generate financial report PDF"}
          </button>
          <p style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 9 }}>Workspace verification is not an independent audit or assurance opinion. Validate source statements before external use.</p>
          {error && <p role="alert" className="error-text" style={{ marginTop: 10, color: "var(--risk)" }}>{error}</p>}
          {done && <div role="status" style={{ marginTop: 14, padding: "10px 12px", background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "var(--radius-soft)", color: "#047857", fontSize: 13, fontWeight: 600 }}>Report generated and downloaded.</div>}
        </form>
      </Card>
    </div>
  );
}
