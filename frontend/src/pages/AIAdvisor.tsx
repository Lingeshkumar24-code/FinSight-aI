import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError, type DocumentListItem } from "../lib/api";

interface ChatEntry {
  role: "user" | "assistant";
  text: string;
  citations?: string[];
}

export function AIAdvisor() {
  const [messages, setMessages] = useState<ChatEntry[]>([
    {
      role: "assistant",
      text: "Ask me about your budget, ratios, risk, forecasts, or \"what if\" scenarios — or any business questions from your uploaded files (annual reports, balance sheets, proposals, or slide decks).",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [docs, setDocs] = useState<DocumentListItem[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>("all");

  useEffect(() => {
    async function loadDocs() {
      try {
        const list = await api.getDocuments();
        setDocs(list);
      } catch {
        // ignore
      }
    }
    void loadDocs();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const query = input.trim();
    if (!query || sending) return;

    setMessages((prev) => [...prev, { role: "user", text: query }]);
    setInput("");
    setSending(true);

    try {
      const targetDoc = selectedDocId === "all" ? undefined : selectedDocId;
      const resp = await api.askAdvisor(query, targetDoc);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: resp.answer,
          citations: resp.citations,
        },
      ]);
    } catch (err) {
      const text = err instanceof ApiError ? err.message : "Something went wrong.";
      setMessages((prev) => [...prev, { role: "assistant", text: `Error: ${text}` }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ maxWidth: 880, display: "flex", flexDirection: "column", height: "calc(100vh - 150px)", minHeight: 480 }}>
      <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>AI Financial Advisor</h1>
          <p className="page-lead" style={{ margin: 0 }}>
            Intelligent multi-agent financial deliberation over uploaded corporate filings and live computations.
          </p>
        </div>

        {docs.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#F5F3EF", padding: "6px 12px", borderRadius: 8, border: "1px solid #E5E0D8" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-muted)" }}>Target Document:</span>
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                padding: "3px 8px",
                borderRadius: 6,
                border: "1px solid #DCD6CA",
                background: "#FFFFFF",
                cursor: "pointer",
              }}
            >
              <option value="all">🔍 All Documents (Auto-Detect)</option>
              {docs.map((d) => (
                <option key={d.id} value={d.id}>
                  📄 {d.filename}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          borderRadius: 20,
          border: "1px solid var(--border)",
          background: "#FFFFFF",
          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.05)",
          padding: "20px 24px 16px 24px",
          minHeight: 0,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          className="chat-log"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            border: "none",
            background: "transparent",
            padding: "0 0 16px 0",
            marginBottom: 0,
          }}
          data-testid="chat-log"
        >
          {messages.map((m, i) => (
            <div key={i} className={`chat-bubble ${m.role}`} style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
              {m.text}
              {m.citations && m.citations.length > 0 && !m.text.includes("Sources:") && (
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px dashed rgba(0,0,0,0.1)", fontSize: 11.5, color: "var(--ink-muted)" }}>
                  📎 Sources: {m.citations.join("; ")}
                </div>
              )}
            </div>
          ))}
          {sending && (
            <div className="chat-bubble assistant" style={{ fontStyle: "italic", color: "var(--ink-muted)" }}>
              Consulting financial models and deliberating…
            </div>
          )}
        </div>

        <form
          className="chat-form"
          onSubmit={handleSubmit}
          style={{
            marginTop: "auto",
            borderTop: "1.5px solid #F1ECE1",
            paddingTop: 14,
            paddingBottom: 2,
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexShrink: 0,
            width: "100%",
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question (e.g. Did we overspend on marketing this quarter?)"
            aria-label="Message"
            style={{
              flex: 1,
              height: 44,
              borderRadius: 10,
              padding: "0 16px",
              boxSizing: "border-box",
              fontSize: 14,
              border: "1.5px solid #DCD6CA",
              background: "#FAFAF9",
              outline: "none",
            }}
          />
          <button
            className="btn btn-primary"
            type="submit"
            disabled={sending}
            style={{
              height: 44,
              padding: "0 26px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
              boxSizing: "border-box",
              fontSize: 14,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
