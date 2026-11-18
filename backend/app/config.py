"""
Centralized settings. All values are overridable via environment
variables / .env (see ../.env.example at the repo root for the full
list with descriptions). Nothing here has a production secret baked
in — every credential defaults to empty string and the app degrades
gracefully (e.g. the LLM router falls back to a template response) when
a given provider's key is absent.
"""
from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "FinSight AI"
    ENV: str = "development"  # development | staging | production
    API_V1_PREFIX: str = "/api/v1"

    # --- CORS ---
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:5175",
        "http://localhost:4173",
        "http://localhost:80",
        "http://frontend:80",
    ]

    # --- Auth (JWT issued by this API; swap for Supabase Auth JWKS verification in prod) ---
    JWT_SECRET: str = "dev-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24

    # --- Database (Supabase Postgres in prod; SQLite for local/dev/tests) ---
    DATABASE_URL: str = "sqlite+aiosqlite:///./finsight.db"

    # --- Supabase (production) ---
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    SUPABASE_STORAGE_BUCKET: str = "financial-documents"

    # --- LLM providers (model-agnostic router) ---
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "meta-llama/llama-3.1-8b-instruct:free"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.1"
    # Priority order the router walks, by provider name.
    LLM_PROVIDER_PRIORITY: list[str] = ["gemini", "openai", "openrouter", "ollama"]

    # --- n8n (automation layer) ---
    N8N_WEBHOOK_URL: str = "http://localhost:5678/webhook/finsight-alerts"
    N8N_SHARED_SECRET: str = "finsight-n8n-secret"


@lru_cache
def get_settings() -> Settings:
    return Settings()
