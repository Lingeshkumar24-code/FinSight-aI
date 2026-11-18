-- FinSight AI — Supabase Postgres schema
-- Mirrors backend/app/db/models.py. If you change one, change the other.
--
-- Run via the Supabase SQL editor, or:
--   supabase db execute --file infra/supabase/schema.sql
--
-- Requires the pgvector extension (enabled by default on Supabase).

create extension if not exists vector;
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- Businesses (tenant root — everything else hangs off this)
-- ---------------------------------------------------------------------
create table if not exists businesses (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    industry text default '',
    currency text default 'USD',
    -- References Supabase's built-in `auth.users` table. Left as a plain
    -- uuid (no FK constraint) so this schema also runs unmodified against
    -- vanilla Postgres in local/docker-compose dev, where auth.users
    -- doesn't exist. In Supabase, optionally tighten this with:
    --   alter table businesses
    --     add constraint businesses_owner_fk
    --     foreign key (owner_user_id) references auth.users (id) on delete set null;
    owner_user_id uuid,
    created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Documents (uploaded financial files — Supabase Storage holds the blob,
-- this table holds metadata + processing status)
-- ---------------------------------------------------------------------
create table if not exists documents (
    id uuid primary key default uuid_generate_v4(),
    business_id uuid not null references businesses (id) on delete cascade,
    filename text not null,
    storage_path text default '',
    status text not null default 'uploaded' check (status in ('uploaded', 'processed', 'failed')),
    created_at timestamptz not null default now()
);

create index if not exists idx_documents_business_id on documents (business_id);

-- ---------------------------------------------------------------------
-- Document chunks + embeddings (RAG index). 1536 dims fits
-- OpenAI text-embedding-3-small; adjust to match whichever embedding
-- model you actually call during ingestion.
-- ---------------------------------------------------------------------
create table if not exists document_chunks (
    id uuid primary key default uuid_generate_v4(),
    document_id uuid not null references documents (id) on delete cascade,
    chunk_index integer not null default 0,
    text text not null,
    embedding vector(1536),
    created_at timestamptz not null default now()
);

create index if not exists idx_document_chunks_document_id on document_chunks (document_id);

-- IVFFlat index for approximate nearest-neighbor search. `lists` should
-- scale roughly with sqrt(row_count); 100 is a reasonable starting
-- point for an early-stage deployment.
create index if not exists idx_document_chunks_embedding
    on document_chunks using ivfflat (embedding vector_cosine_ops)
    with (lists = 100);

-- ---------------------------------------------------------------------
-- Financial records (one row per submitted/extracted period)
-- ---------------------------------------------------------------------
create table if not exists financial_records (
    id uuid primary key default uuid_generate_v4(),
    business_id uuid not null references businesses (id) on delete cascade,
    period text not null,
    revenue numeric not null default 0,
    cogs numeric not null default 0,
    operating_expenses numeric not null default 0,
    net_income numeric not null default 0,
    total_assets numeric not null default 0,
    total_liabilities numeric not null default 0,
    total_equity numeric not null default 0,
    created_at timestamptz not null default now(),
    unique (business_id, period)
);

create index if not exists idx_financial_records_business_id on financial_records (business_id);

-- ---------------------------------------------------------------------
-- Chat messages (AI Advisor conversation history)
-- ---------------------------------------------------------------------
create table if not exists chat_messages (
    id uuid primary key default uuid_generate_v4(),
    business_id uuid not null references businesses (id) on delete cascade,
    role text not null check (role in ('user', 'assistant')),
    content text not null,
    intent text default '',
    created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_business_id on chat_messages (business_id);

-- ---------------------------------------------------------------------
-- Reports (generated PDF/export metadata; blob lives in Supabase Storage)
-- ---------------------------------------------------------------------
create table if not exists reports (
    id uuid primary key default uuid_generate_v4(),
    business_id uuid not null references businesses (id) on delete cascade,
    title text not null,
    period text default '',
    storage_path text default '',
    created_at timestamptz not null default now()
);

create index if not exists idx_reports_business_id on reports (business_id);
