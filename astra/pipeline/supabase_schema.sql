-- Enable pgvector extension
create extension if not exists vector;

-- ASTRA knowledge base table
create table if not exists astra_knowledge (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  domain text not null,
  section text not null,
  content text not null,
  embedding vector(768),  -- nomic-embed-text dimension
  source_file text,
  chunk_index integer,
  metadata jsonb default '{}'
);

-- Vector similarity search index
create index if not exists astra_knowledge_embedding_idx 
  on astra_knowledge 
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Fast domain filter index
create index if not exists astra_knowledge_domain_idx 
  on astra_knowledge(domain);

-- Semantic search function
create or replace function search_knowledge(
  query_embedding vector(768),
  match_domain text default null,
  match_count int default 5,
  similarity_threshold float default 0.3
)
returns table (
  id uuid,
  domain text,
  section text,
  content text,
  similarity float
)
language sql stable
as $$
  select
    id, domain, section, content,
    1 - (embedding <=> query_embedding) as similarity
  from astra_knowledge
  where
    (match_domain is null or domain = match_domain)
    and 1 - (embedding <=> query_embedding) > similarity_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- Corrections learning table
create table if not exists stratum_corrections (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  site_id uuid references stratum_sites(id),
  domain text not null,
  prediction text not null,
  correction text not null,
  context jsonb default '{}',
  learned boolean default false,
  confidence_delta float
);

select 'ASTRA schema ready' as status;

-- ASTRA Events table (ingest worker writes here)
create table if not exists astra_events (
  id bigserial primary key,
  source text not null,
  event_type text not null,
  payload jsonb not null default '{}',
  severity text default 'low',
  status text default 'pending',
  created_at timestamptz default now()
);

-- ASTRA Alerts table (scorer writes here, dashboard reads)
create table if not exists astra_alerts (
  id bigserial primary key,
  event_id bigint,
  source text not null,
  event_type text not null,
  alert_level text not null,
  payload jsonb not null default '{}',
  read boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_events_status on astra_events(status);
create index if not exists idx_alerts_read on astra_alerts(read);
create index if not exists idx_alerts_created on astra_alerts(created_at desc);

-- Phase I ESA critique storage
create table if not exists esa_critiques (
  id bigserial primary key,
  site_address text,
  report_excerpt text,
  critique jsonb not null,
  created_at timestamptz default now()
);

create index if not exists idx_critiques_created on esa_critiques(created_at desc);
