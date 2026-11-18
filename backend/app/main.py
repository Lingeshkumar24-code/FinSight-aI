from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import advisor, auth, documents, financials, reports, simulator
from app.config import get_settings
from app.core.logging import configure_logging
from app.llm.factory import build_llm_router
from app.rag.vectorstore import InMemoryVectorStore


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    configure_logging(settings.ENV)

    # Swap InMemoryVectorStore for the Supabase-pgvector-backed store in
    # production (same VectorStore interface — see app/rag/vectorstore.py).
    app.state.vector_store = InMemoryVectorStore()
    app.state.llm_router = build_llm_router(settings)

    yield
    # (no teardown needed for in-memory store / stateless HTTP providers)


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.APP_NAME,
        description="AI-powered business financial intelligence & decision support.",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    prefix = settings.API_V1_PREFIX
    app.include_router(auth.router, prefix=prefix)
    app.include_router(financials.router, prefix=prefix)
    app.include_router(simulator.router, prefix=prefix)
    app.include_router(advisor.router, prefix=prefix)
    app.include_router(documents.router, prefix=prefix)
    app.include_router(reports.router, prefix=prefix)

    @app.get("/health", tags=["health"])
    def health() -> dict:
        return {"status": "ok", "service": settings.APP_NAME}

    return app


app = create_app()
