# FinSight AI

AI-powered business financial intelligence & decision support — a
working implementation of the architecture below: a LangGraph
multi-agent backend, a model-agnostic LLM router with retry/fallback,
a RAG pipeline over uploaded financial documents, six deterministic
financial calculation engines, and a React dashboard on top.

This is a real, runnable, tested codebase — **95 backend tests + 11
frontend tests, all passing** — not a mockup. Every engine computation
and every API response in the test suite is asserted against a known
correct value, not just "doesn't crash."

## Architecture → code map

| Diagram box | Where it lives |
|---|---|
| React + Vite Frontend | `frontend/` |
| Supabase Auth | `backend/app/core/security.py` (demo JWT now; swap-in point documented in `app/api/routes/auth.py`) |
| LangGraph Orchestration (5 agents) | `backend/app/agents/graph.py` |
| Financial Calculation Engines | `backend/app/engines/` (6 engines) |
| Model-Agnostic AI Router | `backend/app/llm/router.py` + `app/llm/providers/` |
| Document Ingestion & RAG | `backend/app/rag/` |
| Supabase PostgreSQL / pgvector / Storage | `backend/app/db/models.py`, `infra/supabase/schema.sql` |
| n8n Cloud (automation) | `infra/n8n/README.md` |

## Repo layout

```
finsight-ai/
├── backend/                 FastAPI + LangGraph + engines + RAG + LLM router
│   ├── app/
│   ├── tests/                95 tests (unit + integration)
│   ├── scripts/eval_llm_router.py   LLMOps reliability harness
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                 React + Vite + TypeScript dashboard
│   ├── src/
│   ├── Dockerfile / nginx.conf
│   └── package.json
├── infra/
│   ├── supabase/schema.sql          portable Postgres + pgvector schema
│   ├── supabase/rls_policies.sql    Supabase-only RLS (needs auth.uid())
│   └── n8n/                         automation workflow docs
├── .github/workflows/        ci.yml (runs on every PR), deploy.yml (manual)
└── docker-compose.yml        full local stack
```

## Quick start (local, no Docker)

**Backend**
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env   # defaults work out of the box (SQLite, no LLM keys)
uvicorn app.main:app --reload
# → http://localhost:8000/docs for interactive API docs
```

**Frontend**
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
# → http://localhost:5173 (demo login: any email, any password)
```

## Quick start (Docker)

```bash
docker compose up --build
# backend:  http://localhost:8000
# frontend: http://localhost:5173
```

This brings up Postgres with pgvector pre-installed and seeded from
`infra/supabase/schema.sql` automatically (via
`docker-entrypoint-initdb.d`). To also run a local Ollama fallback:
`docker compose --profile local-llm up --build`.

## Running the tests

```bash
# Backend — 95 tests: 6 engines, LLM router fallback/retry, RAG,
# the LangGraph workflow, and every API route
cd backend
pytest -q --cov=app --cov-report=term-missing

# LLMOps reliability harness (simulated provider outage → verifies
# failover; exits non-zero if any scenario fails to get an answer)
python scripts/eval_llm_router.py

# Frontend — 11 tests: API client, AI Advisor chat flow, Simulator
cd frontend
npx vitest run
npx tsc -b && npx vite build   # type-check + production build
```

Coverage is at or near 100% on every financial engine, the LLM
router, and the LangGraph nodes — the parts where a silent bug would
mean a wrong number reaching a business owner. The four provider
HTTP adapters (OpenAI/Gemini/OpenRouter/Ollama) are tested against
mocked HTTP responses (`respx`) rather than live APIs, by design — no
API key is required to run this suite.

## Design decisions worth knowing about

- **Financial engines are pure functions, deliberately not LLM
  calls.** Budget variance, ratios, WACC, risk scoring, forecasting,
  and what-if simulation are all plain deterministic math. The LLM's
  job (in the Response Generation agent) is to *narrate* these
  numbers in plain language — never to compute them. This is a
  product decision, not a limitation: you can unit-test a WACC
  formula; you cannot unit-test "did the model do the arithmetic
  right" with any confidence.
- **The AI Advisor never goes fully silent.** If every LLM provider
  in the router fails (see `AllProvidersFailedError`), the Response
  Generation agent falls back to a deterministic templated summary of
  the computed numbers rather than returning an error. A business
  owner checking their risk flags during a provider outage still gets
  an answer.
- **The LLM router is provider-agnostic by construction.**
  `app/llm/router.py` only knows about the `LLMProvider` interface. It
  retries a flaky provider a couple of times, then fails over to the
  next one in `LLM_PROVIDER_PRIORITY`, logging every attempt
  (`structlog`) so provider reliability is observable in production.
  Ollama (self-hosted) needs no API key, so it's always available as
  the final fallback.
- **The vector store is swappable without touching any caller.**
  `InMemoryVectorStore` (used in dev/tests, zero dependencies) and a
  future `PgVectorStore` both implement the same `VectorStore`
  interface in `app/rag/vectorstore.py`.

## Known gaps / where to go next

This is a complete, working MVP slice of the full diagram, not a
1:1 feature-complete rebuild of every box in it. Specifically:

- **PDF/XLSX ingestion**: the `/documents/upload` endpoint accepts
  plain text today (.txt/.csv/.md). Binary-format extraction is
  designed to happen in the n8n ingestion workflow (see
  `infra/n8n/README.md`) before the already-working text pipeline
  takes over — that seam is documented, not yet wired to a real OCR
  service.
- **Auth**: ships with this API's own demo JWT issuer so the whole
  stack runs standalone. `app/api/routes/auth.py` documents exactly
  what changes to swap in real Supabase Auth.
- **Persistence**: financial figures flow through the engines
  statelessly today (the Dashboard uses sample figures as a stand-in
  for "the business's latest submitted period"). `financial_records`
  exists in the schema and SQLAlchemy models; wiring a real
  write/read path through the API is the natural next step.
- **n8n workflows** are documented in detail (trigger, steps, which
  endpoint they call) plus one fully worked JSON export, rather than
  four JSON exports — the other three are business-specific
  credentials (SMTP, Slack) that would just be dead config as a
  static file.
