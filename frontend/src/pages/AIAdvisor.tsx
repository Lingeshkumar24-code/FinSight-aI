import { useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import { Card } from "../components/ui/Card";

interface ChatEntry {
  role: "user" | "assistant";
  text: string;
}

export function AIAdvisor() {
  const [messages, setMessages] = useState<ChatEntry[]>([
    {
      role: "assistant",
      text: "Ask me about your budget, ratios, risk, forecasts, or \"what if\" scenarios — or anything in an uploaded document.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const query = input.trim();
    if (!query || sending) return;

    setMessages((prev) => [...prev, { role: "user", text: query }]);
    setInput("");
    setSending(true);

    try {
      const resp = await api.askAdvisor(query);
      setMessages((prev) => [...prev, { role: "assistant", text: resp.answer }]);
    } catch (err) {
      const text = err instanceof ApiError ? err.message : "Something went wrong.";
      setMessages((prev) => [...prev, { role: "assistant", text: `Error: ${text}` }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ maxWidth: 840, display: "flex", flexDirection: "column", height: "calc(100vh - 140px)" }}>
      <div style={{ marginBottom: 16 }}>
        <h1>AI Financial Advisor</h1>
        <p className="page-lead">
          Intelligent multi-agent financial deliberation over uploaded corporate filings and live computations.
        </p>
      </div>

      <Card style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: 16 }}>
        <div className="chat-log" style={{ flex: 1, overflowY: "auto", border: "none", background: "transparent", padding: 0 }} data-testid="chat-log">
          {messages.map((m, i) => (
            <div key={i} className={`chat-bubble ${m.role}`}>
              {m.text}
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
            marginTop: 12,
            borderTop: "1px solid var(--border)",
            paddingTop: 14,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question (e.g. Did we overspend on marketing this quarter?)"
            aria-label="Message"
            style={{
              flex: 1,
              height: 42,
              borderRadius: "var(--radius-soft)",
              padding: "0 14px",
              boxSizing: "border-box",
              fontSize: 14,
            }}
          />
          <button
            className="btn btn-primary"
            type="submit"
            disabled={sending}
            style={{
              height: 42,
              padding: "0 22px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "var(--radius-soft)",
              boxSizing: "border-box",
            }}
          >
            Send
          </button>
        </form>
      </Card>
    </div>
  );
}
