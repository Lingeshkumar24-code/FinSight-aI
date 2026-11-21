import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { api, ApiError, type FraudAlert, type FraudSummary, type FraudTransaction, type FraudUpload } from "../lib/api";
import { Card } from "../components/ui/Card";

function money(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function riskClass(level: string): string {
  if (level === "high") return "is-bad";
  if (level === "medium") return "is-watch";
  return "is-good";
}

export function FraudDetection() {
  const [summary, setSummary] = useState<FraudSummary | null>(null);
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [transactions, setTransactions] = useState<FraudTransaction[]>([]);
  const [upload, setUpload] = useState<FraudUpload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const [summaryResult, alertResult, transactionResult] = await Promise.allSettled([
      api.getFraudSummary(),
      api.listFraudAlerts(),
      api.listFraudTransactions(),
    ]);
    if (summaryResult.status === "fulfilled") setSummary(summaryResult.value);
    if (alertResult.status === "fulfilled") setAlerts(alertResult.value);
    if (transactionResult.status === "fulfilled") setTransactions(transactionResult.value);
  }

  useEffect(() => {
    void load();
  }, []);

  async function processFile(file: File) {
    setSelectedFileName(file.name);
    setBusy(true);
    setError(null);
    try {
      const result = await api.uploadFraudTransactions(file);
      setUpload(result);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not scan transactions");
    } finally {
      setBusy(false);
    }
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFile(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processFile(file);
    }
  }

  async function review(alert: FraudAlert, action: "confirm" | "dismiss" | "escalate") {
    setBusy(true);
    setError(null);
    try {
      await api.reviewFraudAlert(alert.id, { action, note: `Reviewed from dashboard`, reviewer: "owner" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save review");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-enter flex flex-col gap-5 w-full" data-testid="fraud-page">
      <div className="page-header">
        <div>
          <h1>Transaction Fraud Screening</h1>
          <p className="page-lead">Screen CSV and Excel transaction files for explainable risk indicators. A flag requests human review; it does not prove fraud.</p>
        </div>
        <span className="data-badge is-live">rule engine</span>
      </div>

      {error && <div className="page-state is-error"><p className="error-text">{error}</p></div>}

      <div className="stat-strip">
        <div><span>Transactions</span><strong className="num">{summary?.total_transactions ?? 0}</strong></div>
        <div><span>Suspicious</span><strong className="num">{summary?.suspicious_transactions ?? 0}</strong></div>
        <div><span>High Risk</span><strong className="num">{summary?.high_risk_alerts ?? 0}</strong></div>
        <div><span>Duplicates</span><strong className="num">{summary?.duplicate_count ?? 0}</strong></div>
      </div>

      <Card>
        <div className="section-header">
          <h2>Scan Transaction File</h2>
          <span className="section-run">CSV · XLSX · XLS</span>
        </div>

        {/* Hidden accessible file input for test automation and screen readers */}
        <input
          ref={fileInputRef}
          aria-label="Fraud transaction file"
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          onChange={(e) => void importFile(e)}
          disabled={busy}
          style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
        />

        {/* Attractive Executive Upload Dropzone */}
        <div
          role="region"
          aria-label="Upload Transaction File Dropzone"
          onClick={() => !busy && fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${isDragging ? "#16845B" : "#DCD6CA"}`,
            borderRadius: 14,
            background: isDragging ? "#F0FDF4" : "#FCFAF6",
            padding: "26px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            cursor: busy ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            textAlign: "center",
          }}
          onMouseEnter={(e) => {
            if (!busy && !isDragging) {
              e.currentTarget.style.borderColor = "#A58A62";
              e.currentTarget.style.background = "#F9F6F0";
            }
          }}
          onMouseLeave={(e) => {
            if (!busy && !isDragging) {
              e.currentTarget.style.borderColor = "#DCD6CA";
              e.currentTarget.style.background = "#FCFAF6";
            }
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 22px",
                fontSize: 13.5,
                fontWeight: 600,
                borderRadius: 10,
                boxShadow: "0 4px 14px rgba(23, 23, 23, 0.12)",
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>{busy ? "Scanning Transactions…" : selectedFileName ? "Change Transaction File" : "Choose Transaction File"}</span>
            </button>
            <span style={{ fontSize: 13, color: selectedFileName ? "#16845B" : "#77736B", fontWeight: selectedFileName ? 600 : 400 }}>
              {selectedFileName ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <span style={{ color: "#16845B" }}>✓</span> {selectedFileName}
                </span>
              ) : (
                "or drag and drop a bank transaction CSV or Excel workbook here"
              )}
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: "#8E887E", display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
            <span>• CSV, Excel .xlsx and legacy .xls</span>
            <span>• Needs date and amount or debit/credit columns</span>
            <span>• Checks duplicates, reference reuse, same-day frequency and vendor outliers</span>
          </div>
        </div>
        {upload && (
          <div className={`fraud-assessment ${upload.assessment === "review_required" ? "is-risk" : upload.assessment === "unable_to_assess" ? "is-unknown" : "is-clear"}`} data-testid="fraud-file-assessment" role="status">
            <strong>{upload.assessment === "review_required" ? "Review required: risk indicators found" : upload.assessment === "unable_to_assess" ? "Unable to assess this file" : "No configured indicators found"}</strong>
            <p>{upload.assessment_note}</p>
            <p className="muted-note">{upload.file_name} · {upload.alerts_created} alert rows · {upload.valid} valid transactions · {upload.invalid} rejected rows</p>
          </div>
        )}
        {upload && upload.validation_errors.length > 0 && (
          <ul className="assumption-list mt-3">
            {upload.validation_errors.map((item) => <li key={item}>{item}</li>)}
          </ul>
        )}
      </Card>

      <Card>
        <div className="section-header"><h2>Screening Rules and Limits</h2><span className="section-run">Explainable checks</span></div>
        <ul className="assumption-list">
          <li>Repeated transaction IDs and repeated date/amount/vendor/reference combinations.</li>
          <li>The same invoice/reference reused with different transaction details.</li>
          <li>Three or more payments to one vendor on the same date.</li>
          <li>Vendor amount at least three times its median, only when five or more vendor records are available in the scanned data.</li>
          <li>Zero-value transactions, future-dated transactions, and missing vendor names are flagged as data-quality or review signals.</li>
        </ul>
        <p className="muted-note mt-3">This screen does not perform sanctions/PEP screening, identity or signature verification, invoice-to-ledger reconciliation, network/device analysis, or regulator reporting. No single checklist covers every jurisdiction or business. RBI and PMLA obligations apply to specified regulated entities and require institution-specific controls and human decisions; this tool is an initial transaction-screening aid, not a compliance certification or legal finding.</p>
        <p className="muted-note">Official references: <a href="https://www.rbi.org.in/Scripts/BS_ViewMasterDirections.aspx?did=402" target="_blank" rel="noreferrer">RBI Master Directions by regulated entity</a> · <a href="https://www.indiacode.nic.in/indiacode/handle/123456789/2036?view_type=browse" target="_blank" rel="noreferrer">Prevention of Money-Laundering Act, 2002</a> · <a href="https://upload.indiacode.nic.in/showfile?actid=AC_CEN_2_2_00035_200315_1517807326550&amp;filename=The+Prevention+of+Money-laundering+%28Maintenance+of+Records%29+Rules%2C+2005.pdf&amp;type=rule" target="_blank" rel="noreferrer">PML (Maintenance of Records) Rules, 2005</a>.</p>
      </Card>

      <div className="split-grid">
        <Card>
          <div className="section-header"><h2>Open Alerts</h2><span className="section-run">{alerts.length} alerts</span></div>
          <div className="data-table" style={{ maxHeight: 480, overflowY: "auto" }}>
            <table>
              <thead>
                <tr><th>Transaction</th><th>Vendor</th><th className="num">Amount</th><th>Risk</th><th>Reason</th><th>Review</th></tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert.id}>
                    <td>{alert.transaction_id}</td>
                    <td>{alert.vendor || "—"}</td>
                    <td className="num">{money(alert.amount)}</td>
                    <td><span className={`pill ${riskClass(alert.risk_level)}`}>{alert.risk_level}</span></td>
                    <td style={{ whiteSpace: "normal", minWidth: 260 }} className="muted-note">{alert.reason}</td>
                    <td>
                      <div className="flex gap-2">
                        <button type="button" className="btn btn-primary btn-small" disabled={busy} onClick={() => void review(alert, "confirm")}>Confirm</button>
                        <button type="button" className="btn btn-secondary btn-small" disabled={busy} onClick={() => void review(alert, "dismiss")}>Dismiss</button>
                        <button type="button" className="btn btn-secondary btn-small" disabled={busy} onClick={() => void review(alert, "escalate")}>Escalate</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {alerts.length === 0 && <tr><td colSpan={6} className="muted-note">No fraud alerts yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <div className="section-header"><h2>Scanned Transactions</h2><span className="section-run">{transactions.length} records</span></div>
          <div className="data-table" style={{ maxHeight: 480, overflowY: "auto" }}>
            <table>
              <thead><tr><th>ID</th><th>Date</th><th>Vendor</th><th className="num">Amount</th></tr></thead>
              <tbody>
                {transactions.map((item) => (
                  <tr key={item.id}>
                    <td>{item.transaction_id}</td><td>{item.date}</td>
                    <td>{item.vendor || "—"}</td><td className="num">{money(item.amount)}</td>
                  </tr>
                ))}
                {transactions.length === 0 && <tr><td colSpan={4} className="muted-note">Upload a transaction CSV or Excel workbook to begin.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
