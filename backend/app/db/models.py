"""
SQLAlchemy models mirroring the Supabase Postgres schema in
infra/supabase/schema.sql. Kept intentionally close to that SQL file —
if you change one, change the other.

Note on pgvector: the `embedding` column on DocumentChunk is declared
here as Text (a JSON-encoded float list) so this file works against
plain SQLite in dev/tests with zero extra drivers. In Postgres, run the
migration in infra/supabase/schema.sql, which declares it as a native
`vector` column instead — the ORM model does not need pgvector-specific
typing for the rest of the app to function, since all similarity search
goes through the VectorStore abstraction (app/rag/vectorstore.py), not
raw SQL in this file.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Business(Base):
    __tablename__ = "businesses"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String, nullable=False)
    industry: Mapped[str] = mapped_column(String, default="")
    currency: Mapped[str] = mapped_column(String, default="USD")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    documents: Mapped[list["Document"]] = relationship(back_populates="business")
    financial_records: Mapped[list["FinancialRecord"]] = relationship(back_populates="business")
    chat_messages: Mapped[list["ChatMessage"]] = relationship(back_populates="business")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id"), nullable=False)
    filename: Mapped[str] = mapped_column(String, nullable=False)
    storage_path: Mapped[str] = mapped_column(String, default="")
    status: Mapped[str] = mapped_column(String, default="uploaded")  # uploaded|processed|failed
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    business: Mapped["Business"] = relationship(back_populates="documents")
    chunks: Mapped[list["DocumentChunkRow"]] = relationship(back_populates="document")


class DocumentChunkRow(Base):
    __tablename__ = "document_chunks"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"), nullable=False)
    chunk_index: Mapped[int] = mapped_column(default=0)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    # JSON-encoded float list in SQLite; native `vector` type in Postgres (see schema.sql)
    embedding: Mapped[str] = mapped_column(Text, default="")

    document: Mapped["Document"] = relationship(back_populates="chunks")


class FinancialRecord(Base):
    """A single period's worth of submitted/extracted financial figures."""

    __tablename__ = "financial_records"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id"), nullable=False)
    period: Mapped[str] = mapped_column(String, nullable=False)
    revenue: Mapped[float] = mapped_column(Float, default=0.0)
    cogs: Mapped[float] = mapped_column(Float, default=0.0)
    operating_expenses: Mapped[float] = mapped_column(Float, default=0.0)
    net_income: Mapped[float] = mapped_column(Float, default=0.0)
    total_assets: Mapped[float] = mapped_column(Float, default=0.0)
    total_liabilities: Mapped[float] = mapped_column(Float, default=0.0)
    total_equity: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    business: Mapped["Business"] = relationship(back_populates="financial_records")


class ChatMessage(Base):
    """AI Advisor conversation history."""

    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id"), nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False)  # user|assistant
    content: Mapped[str] = mapped_column(Text, nullable=False)
    intent: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    business: Mapped["Business"] = relationship(back_populates="chat_messages")


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id"), nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    period: Mapped[str] = mapped_column(String, default="")
    storage_path: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
