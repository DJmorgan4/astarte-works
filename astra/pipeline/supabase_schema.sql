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
