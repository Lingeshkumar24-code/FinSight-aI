import { useRef, useState } from "react";
import { api, ApiError, type DocumentUploadResponse } from "../lib/api";
import { Card } from "../components/ui/Card";

export function Upload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<DocumentUploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload() {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Please select a valid document to index.");
      return;
    }
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const resp = await api.uploadDocument(file);
      setResult(resp);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 640 }}>
      <div>
        <h1>Document Ingestion & RAG Indexing</h1>
        <p className="page-lead">
          Upload balance sheets, income statements, budgets, or financial models (.xlsx, .csv, .txt, .md) to vectorize and enrich the AI Advisor knowledge base.
        </p>
      </div>

      <Card>
        <div className="section-header">
          <h2>Select Financial Document</h2>
          <span className="section-run">Supported: XLSX, CSV, TXT, MD</span>
        </div>
        <div style={{ marginTop: 14 }}>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv,.txt,.md"
            data-testid="file-input"
            style={{
              padding: "12px",
              border: "1px dashed var(--border-strong)",
              background: "var(--surface-raised)",
              cursor: "pointer",
            }}
          />
          <div style={{ marginTop: 18 }}>
            <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
              {uploading ? "Chunking & Vectorizing…" : "Upload & index"}
            </button>
          </div>
        </div>
      </Card>

      {error && <p className="error-text">{error}</p>}

      {result && (
        <Card title="Indexing Successful">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>✅</span>
            <div>
              <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>Vector Ingestion Complete</h3>
              <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink-soft)" }}>
                <strong>{result.source}</strong> — {result.chunks_indexed} semantic chunk(s) indexed with vector embeddings. You can now query this document via the AI Advisor.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
