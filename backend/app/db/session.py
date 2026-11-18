"""
Async SQLAlchemy session management.

Production: DATABASE_URL points at Supabase Postgres (postgresql+asyncpg://...).
Local/dev/CI: defaults to SQLite (sqlite+aiosqlite:///./finsight.db) so the
whole stack runs with zero external services. Swapping engines is a one-line
.env change — no application code changes.
"""
from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings
from app.db.models import Base

settings = get_settings()

engine = create_async_engine(settings.DATABASE_URL, echo=False, future=True)
AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)


async def init_models() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
