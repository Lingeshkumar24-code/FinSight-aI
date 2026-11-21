# FinSight AI

FinSight AI is a financial intelligence web app for exploring business financials, uploading financial documents, reviewing calculated metrics, and asking an AI advisor questions grounded in uploaded material.

## Live application

| Service | URL |
|---|---|
| Frontend | https://finsight-frontend-2w1v.onrender.com |
| Backend API | https://finsight-backend-kxfy.onrender.com |
| API documentation | https://finsight-backend-kxfy.onrender.com/docs |
| Health check | https://finsight-backend-kxfy.onrender.com/health |

The free Render services can take a short time to wake after inactivity.

## Features

- Financial dashboard and financial record views
- Upload and process `.pdf`, `.docx`, `.txt`, `.md`, `.csv`, `.xlsx`, `.xlsm`, `.xltx`, `.xltm`, and `.xls` files
- Financial metric calculations, forecasts, budgets, and what-if simulation
- AI advisor with document retrieval and source-aware responses
- Financial statement verification and fraud-screening workflows
- Reports, money management, market intelligence, and paper-trading tools
- Account registration with a separate business workspace for each registered account

The AI advisor depends on configured model-provider credentials. Without a provider, some AI responses may use the application's fallback behavior. Market data availability depends on upstream providers and API limits.

## Technology

- **Frontend:** React, TypeScript, Vite
- **Backend:** Python, FastAPI, SQLAlchemy, LangGraph
- **Data:** SQLite for local development; PostgreSQL on Supabase for the deployed backend
- **Retrieval:** document chunking and vector retrieval, with persisted document metadata and chunks in PostgreSQL
- **Hosting:** Render static site and web service

## Repository layout

```text
backend/                 FastAPI app, financial engines, AI/RAG services, and tests
frontend/                React/Vite application
infra/supabase/          PostgreSQL schema and Supabase policy SQL
infra/n8n/               Automation workflow documentation and exports
render.yaml              Render service configuration
```

## Run locally

### Requirements

- Python 3.11
- Node.js 20 or later
- npm

### Backend

From the repository root, create and activate a virtual environment, install dependencies, and start the API:

```powershell
cd backend
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item ..\.env.example .env
uvicorn app.main:app --reload --port 8000
```

The backend defaults to a local SQLite database. Its interactive API docs are at `http://localhost:8000/docs` and health check at `http://localhost:8000/health`.

### Frontend

In a second terminal, from the repository root:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
```

Set `VITE_API_BASE_URL` in `frontend/.env` to `http://localhost:8000/api/v1`, then run:

```powershell
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`). Register a local test account to try the account-scoped workflows.

### Docker Compose

The development Compose stack starts the frontend, backend, PostgreSQL with pgvector, and n8n:

```bash
docker compose up --build
```

The frontend is served at `http://localhost:5173`; the API is at `http://localhost:8000`. To include the optional local Ollama service:

```bash
docker compose --profile local-llm up --build
```

## Configuration

The root `.env.example` documents backend configuration. The frontend template is `frontend/.env.example`.

Common backend variables:

| Variable | Purpose |
|---|---|
| `ENV` | Runtime mode (`development`, `staging`, or `production`) |
| `JWT_SECRET` | Secret used by the API to sign access tokens; use a long, unique value outside local development |
| `DATABASE_URL` | SQLAlchemy async database URL; local SQLite is the default, production should use Supabase PostgreSQL |
| `CORS_ORIGINS` | JSON array of allowed browser origins |
| `LLM_PROVIDER_PRIORITY` | Ordered provider names used by the model router |
| `GROQ_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY` | Optional provider credentials; configure only providers you intend to use |
| `TWELVEDATA_API_KEY` | Optional Twelve Data key for supported market data features |
| `RESEND_API_KEY` | Optional Resend key for email delivery |

Never commit `.env` files, database URLs, JWT secrets, or provider keys. Configure production values as secret environment variables in Render. Do not put database credentials or server API keys in `frontend/.env` or any `VITE_` variable.

## Supabase PostgreSQL

The production backend uses Supabase PostgreSQL through the **Session Pooler**. Configure `DATABASE_URL` in the Render backend environment using the connection details from Supabase's **Connect → Session pooler** panel. For SQLAlchemy async connections, the URL format is:

```text
postgresql+asyncpg://POOLER_USER:URL_ENCODED_PASSWORD@POOLER_HOST:5432/postgres?ssl=require
```

Keep the completed URL private and out of Git. The checked-in schema is at `infra/supabase/schema.sql`; review it before applying it to a new database. The application issues its own API JWTs and scopes records by the workspace ID in that token. Do not expose database credentials or use a privileged database key in the browser.

## Tests and checks

Run backend checks from `backend/`:

```bash
ruff check app tests
pytest -q --cov=app --cov-report=term-missing
python scripts/eval_llm_router.py
```

Run frontend checks from `frontend/`:

```bash
npm install
npx tsc -b
npx vitest run
npx vite build
```

The GitHub Actions workflow in `.github/workflows/ci.yml` runs backend lint/tests, frontend type-check/tests/build, and Docker image builds for pushes and pull requests to `main`.

## Deployment

The Render configuration is in `render.yaml`. The backend and frontend are configured for automatic deployment from `main`:

- Frontend: https://finsight-frontend-2w1v.onrender.com
- Backend: https://finsight-backend-kxfy.onrender.com

Set required production secrets in the corresponding Render service environment. After deployment, verify `/health`, sign in with a test account, upload a non-sensitive sample, compare dashboard figures with its source, and check that advisor responses cite the relevant uploaded material.

## Important use note

FinSight AI provides financial analysis and decision-support features. Verify outputs against source records and qualified professional judgment; the app is not an audit, assurance, tax, legal, or investment opinion.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
