import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, type AdvisorResponse, type DocumentListItem, type DocumentUploadResponse } from "../lib/api";
import { Card } from "../components/ui/Card";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Replace bare numbers that look like amounts with ₹ in AI answer text
function formatAnswerText(text: string): string {
  // Replace patterns like Rs. 1,00,000 or INR 50000 or plain large numbers in context
  return text
    .replace(/\bRs\.?\s*/gi, "₹")
    .replace(/\bINR\s*/gi, "₹")
    .replace(/\bUSD\s*/gi, "₹");
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "#0A0A0A",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 20px",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    transition: "all 0.2s ease",
  } as React.CSSProperties,

  btnSecondary: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "#fff",
    color: "#0A0A0A",
    border: "1.5px solid #0A0A0A",
    borderRadius: 8,
    padding: "10px 20px",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    transition: "all 0.2s ease",
  } as React.CSSProperties,

  btnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  } as React.CSSProperties,
};

// ── Component ─────────────────────────────────────────────────────────────────

export function Upload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<DocumentUploadResponse | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Document history state
  const [historyDocs, setHistoryDocs] = useState<DocumentListItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const docs = await api.getDocuments();
      setHistoryDocs(docs);
    } catch {
      // ignore
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  async function handleDelete(docId: string, filename: string) {
    if (!window.confirm(`Are you sure you want to delete "${filename}" and its indexed vector records from your workspace?`)) return;
    setDeletingId(docId);
    try {
      await api.deleteDocument(docId);
      await loadDocuments();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete document");
    } finally {
      setDeletingId(null);
    }
  }

  // AI Q&A state
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<AdvisorResponse | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [autoAnswerDone, setAutoAnswerDone] = useState(false);

  // ── Drag & Drop handlers ───────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
      setUploadError(null);
      setAiAnswer(null);
      setAutoAnswerDone(false);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setResult(null);
    setUploadError(null);
    setAiAnswer(null);
    setAutoAnswerDone(false);
  };

  // ── Upload ─────────────────────────────────────────────────────────────────

  async function handleUpload() {
    if (!selectedFile) {
      setUploadError("Please select a file first.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    setResult(null);
    setAiAnswer(null);
    setAutoAnswerDone(false);
    try {
      const resp = await api.uploadDocument(selectedFile);
      setResult(resp);
      void loadDocuments();
      // Mark indexing complete immediately. The optional AI summary is a
      // separate LLM request and must not make a successful upload look
      // stuck on "Chunking & Vectorising" when a provider is slow or rate
      // limited.
      setUploading(false);
      void askQuestion("Summarize the financial data in this document", true);
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  // ── AI Q&A ─────────────────────────────────────────────────────────────────

  async function askQuestion(q: string, isAuto = false) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setAsking(true);
    setAiError(null);
    if (!isAuto) setAiAnswer(null);
    try {
      const resp = await api.askAdvisor(trimmed);
      setAiAnswer(resp);
      if (isAuto) setAutoAnswerDone(true);
    } catch (err) {
      setAiError(err instanceof ApiError ? err.message : "AI request failed.");
    } finally {
      setAsking(false);
    }
  }

  async function handleAskSubmit(e: React.FormEvent) {
    e.preventDefault();
    await askQuestion(question);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 720 }}>
      {/* Page header */}
      <div>
        <h1 style={{ marginBottom: 6 }}>📂 Document Upload & RAG Indexing</h1>
        <p className="page-lead">
          Upload your business Excel file (revenue, profits, expenses) to let the AI Advisor answer
          questions from it. Supported: <strong>.xlsx, .xls, .docx, .pdf, .csv, .txt, .md</strong>
        </p>
      </div>

      {/* Upload card */}
      <Card>
        <div className="section-header">
          <h2>Upload Financial Document</h2>
          <span className="section-run">XLSX · CSV · TXT · MD</span>
        </div>

        <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 6, marginBottom: 14 }}>
          Upload balance sheets, income statements, budgets, or revenue/expense sheets. The AI will
          index the content and answer your questions using{" "}
          <strong>Indian Rupee (₹)</strong> formatting.
        </p>

        {/* Drag-and-drop zone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragOver ? "#0A0A0A" : "var(--border-strong)"}`,
            borderRadius: 12,
            padding: "36px 24px",
            textAlign: "center",
            cursor: "pointer",
            background: dragOver ? "var(--surface-raised)" : "transparent",
            transition: "all 0.2s ease",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 10 }}>📊</div>
          {selectedFile ? (
            <div>
              <p style={{ fontWeight: 600, fontSize: 15, margin: "0 0 4px" }}>
                {selectedFile.name}
              </p>
              <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0 }}>
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
          ) : (
            <div>
              <p style={{ fontWeight: 600, fontSize: 15, margin: "0 0 4px" }}>
                Drop your Excel / CSV / TXT here
              </p>
              <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0 }}>
                or <span style={{ textDecoration: "underline" }}>click to browse</span>
              </p>
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.docx,.pdf,.csv,.txt,.md"
          data-testid="file-input"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
          <button
            style={{
              ...styles.btnPrimary,
              ...(uploading || !selectedFile ? styles.btnDisabled : {}),
            }}
            onClick={handleUpload}
            disabled={uploading || !selectedFile}
            onMouseEnter={(e) => {
              if (!uploading && selectedFile)
                (e.currentTarget as HTMLButtonElement).style.background = "#2a2a2a";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                uploading || !selectedFile ? "#0A0A0A" : "#0A0A0A";
            }}
          >
            {uploading ? "⏳ Chunking & Vectorising…" : "⬆ Upload & Index"}
          </button>

          {selectedFile && (
            <button
              style={styles.btnSecondary}
              onClick={() => {
                setSelectedFile(null);
                setResult(null);
                setUploadError(null);
                setAiAnswer(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "#f5f5f5";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "#fff";
              }}
            >
              ✕ Clear
            </button>
          )}
        </div>

        {uploadError && (
          <p
            style={{
              marginTop: 12,
              color: "#dc2626",
              fontSize: 13,
              background: "#fef2f2",
              padding: "8px 12px",
              borderRadius: 6,
            }}
          >
            ⚠ {uploadError}
          </p>
        )}
      </Card>

      {/* Success + chunks indexed */}
      {result && (
        <Card>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <span style={{ fontSize: 28, lineHeight: 1 }}>✅</span>
            <div>
              <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>Indexed Successfully</h3>
              <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink-soft)" }}>
                <strong>{result.source}</strong> — {" "}
                <strong style={{ color: "var(--accent)" }}>{result.chunks_indexed}</strong>{" "}
                semantic chunk{result.chunks_indexed !== 1 ? "s" : ""} vectorised and stored.
                The AI Advisor can now answer questions from this document.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* AI Q&A section — shown after upload */}
      {result && (
        <Card>
          <div className="section-header">
            <h2>🤖 Ask AI About This Document</h2>
          </div>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "6px 0 16px" }}>
            Ask anything about the uploaded file — revenue trends, expense breakdowns, profit
            margins. Monetary values will be shown in <strong>₹ Indian Rupees</strong>.
          </p>

          <form onSubmit={handleAskSubmit} style={{ display: "flex", gap: 10 }}>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. What is the total revenue? Which month had highest expenses?"
              style={{
                flex: 1,
                padding: "10px 14px",
                border: "1.5px solid var(--border-strong)",
                borderRadius: 8,
                fontSize: 14,
                outline: "none",
                transition: "border-color 0.2s ease",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#0A0A0A")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
            />
            <button
              type="submit"
              style={{
                ...styles.btnPrimary,
                ...(asking || !question.trim() ? styles.btnDisabled : {}),
              }}
              disabled={asking || !question.trim()}
              onMouseEnter={(e) => {
                if (!asking && question.trim())
                  (e.currentTarget as HTMLButtonElement).style.background = "#2a2a2a";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "#0A0A0A";
              }}
            >
              {asking ? "⏳ Thinking…" : "▶ Ask AI"}
            </button>
          </form>

          {/* Suggested quick questions */}
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              "What is the total revenue?",
              "Which month had the highest expenses?",
              "What is the net profit margin?",
              "Show a summary of all financial data",
            ].map((q) => (
              <button
                key={q}
                style={{
                  ...styles.btnSecondary,
                  padding: "5px 12px",
                  fontSize: 12,
                  borderRadius: 20,
                }}
                onClick={() => {
                  setQuestion(q);
                  askQuestion(q);
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "#f5f5f5";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "#fff";
                }}
              >
                {q}
              </button>
            ))}
          </div>

          {aiError && (
            <p
              style={{
                marginTop: 12,
                color: "#dc2626",
                fontSize: 13,
                background: "#fef2f2",
                padding: "8px 12px",
                borderRadius: 6,
              }}
            >
              ⚠ {aiError}
            </p>
          )}
        </Card>
      )}

      {/* AI Answer display */}
      {aiAnswer && (
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>🧠</span>
            <h3 style={{ margin: 0, fontSize: 15 }}>
              {autoAnswerDone && !asking ? "Document Summary" : "AI Answer"}
            </h3>
            {aiAnswer.intent && (
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 11,
                  color: "var(--ink-soft)",
                  background: "var(--surface-raised)",
                  padding: "2px 8px",
                  borderRadius: 20,
                }}
              >
                {aiAnswer.intent}
              </span>
            )}
          </div>

          <div
            style={{
              fontSize: 14,
              lineHeight: 1.75,
              whiteSpace: "pre-wrap",
              color: "var(--ink)",
            }}
          >
            {formatAnswerText(aiAnswer.answer)}
          </div>

          {aiAnswer.citations && aiAnswer.citations.length > 0 && (
            <div style={{ marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", margin: "0 0 6px" }}>
                📎 Sources
              </p>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {aiAnswer.citations.map((c, i) => (
                  <li key={i} style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 2 }}>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {aiAnswer.validation_notes && aiAnswer.validation_notes.length > 0 && (
            <div
              style={{
                marginTop: 10,
                background: "var(--surface-raised)",
                borderRadius: 6,
                padding: "8px 12px",
              }}
            >
              {aiAnswer.validation_notes.map((note, i) => (
                <p key={i} style={{ fontSize: 12, color: "var(--ink-soft)", margin: "2px 0" }}>
                  ℹ {note}
                </p>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Workspace Document History & CRUD */}
      <Card>
        <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2>📁 Workspace Document History</h2>
            <span className="section-run">Supabase Database &amp; Vector Index</span>
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: "3px 10px",
              borderRadius: 20,
              background: historyDocs.length > 0 ? "#EAF4EE" : "#F3F4F6",
              color: historyDocs.length > 0 ? "#16845B" : "#6B7280",
            }}
          >
            {historyDocs.length} {historyDocs.length === 1 ? "document" : "documents"} indexed
          </span>
        </div>

        <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4, marginBottom: 16 }}>
          All corporate filings, statements, and spreadsheets uploaded to this workspace. The AI Advisor automatically queries these files for verified citations.
        </p>

        {loadingDocs && historyDocs.length === 0 ? (
          <div style={{ padding: "20px 0", textAlign: "center", color: "var(--ink-muted)", fontSize: 13 }}>
            Loading workspace documents…
          </div>
        ) : historyDocs.length === 0 ? (
          <div
            style={{
              padding: "24px 16px",
              textAlign: "center",
              background: "var(--surface-raised, #F9F6F0)",
              borderRadius: 10,
              border: "1px dashed var(--border)",
            }}
          >
            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>
              No documents in your workspace yet.
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--ink-soft)" }}>
              Drag &amp; drop an Excel workbook (.xlsx), invoice, or financial statement above to start building your private knowledge base.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1.5px solid var(--border)", textAlign: "left", color: "var(--ink-soft)", fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  <th style={{ padding: "10px 8px" }}>Document</th>
                  <th style={{ padding: "10px 8px" }}>Chunks</th>
                  <th style={{ padding: "10px 8px" }}>Status</th>
                  <th style={{ padding: "10px 8px" }}>Uploaded</th>
                  <th style={{ padding: "10px 8px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {historyDocs.map((doc) => (
                  <tr key={doc.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.15s ease" }}>
                    <td style={{ padding: "12px 8px", fontWeight: 600, color: "var(--ink)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span>📄</span>
                        <span style={{ wordBreak: "break-all" }}>{doc.filename}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 8px", color: "var(--ink-soft)" }}>
                      {doc.chunks_indexed} {doc.chunks_indexed === 1 ? "chunk" : "chunks"}
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 12,
                          background: doc.status === "processed" ? "#EAF4EE" : "#FEF3C7",
                          color: doc.status === "processed" ? "#16845B" : "#B45309",
                        }}
                      >
                        {doc.status === "processed" ? "Active" : doc.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 8px", color: "var(--ink-muted)", fontSize: 12 }}>
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </td>
                    <td style={{ padding: "12px 8px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setQuestion(`Summarize the financial data in ${doc.filename}`);
                            void askQuestion(`Summarize the financial data in ${doc.filename}`);
                          }}
                          style={{
                            padding: "4px 10px",
                            fontSize: 11.5,
                            fontWeight: 600,
                            borderRadius: 6,
                            background: "#EFF6FF",
                            border: "1px solid #BFDBFE",
                            color: "#1D4ED8",
                            cursor: "pointer",
                          }}
                          title="Ask AI Advisor about this file"
                        >
                          💬 Ask AI
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === doc.id}
                          onClick={() => void handleDelete(doc.id, doc.filename)}
                          style={{
                            padding: "4px 10px",
                            fontSize: 11.5,
                            fontWeight: 600,
                            borderRadius: 6,
                            background: "#FEF2F2",
                            border: "1px solid #FECACA",
                            color: "#DC2626",
                            cursor: deletingId === doc.id ? "not-allowed" : "pointer",
                            opacity: deletingId === doc.id ? 0.5 : 1,
                          }}
                          title="Delete from workspace"
                        >
                          {deletingId === doc.id ? "…" : "🗑️ Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* How-to guide */}
      <Card>
        <div className="section-header">
          <h2>📋 How It Works</h2>
        </div>
        <ol style={{ fontSize: 13.5, lineHeight: 2, paddingLeft: 20, margin: "10px 0 0" }}>
          <li>
            <strong>Prepare your file</strong> — Export your revenue, profit &amp; expense data as
            an Excel (.xlsx/.xls), DOCX, PDF, or CSV. Each row, sheet, table, or page becomes a searchable chunk.
          </li>
          <li>
            <strong>Upload &amp; index</strong> — The system extracts text from every sheet, splits
            it into semantic chunks, and stores vector embeddings in the RAG store.
          </li>
          <li>
            <strong>Ask the AI</strong> — The AI Advisor retrieves the most relevant chunks and
            generates an answer with citations, showing amounts in <strong>₹</strong>.
          </li>
        </ol>
        <div
          style={{
            marginTop: 14,
            background: "var(--surface-raised)",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 13,
            color: "var(--ink-soft)",
          }}
        >
          💡 <strong>Tip:</strong> Name your Excel columns clearly (e.g. "Month", "Revenue ₹",
          "Expenses ₹", "Net Profit") for best AI comprehension.
        </div>
      </Card>
    </div>
  );
}
