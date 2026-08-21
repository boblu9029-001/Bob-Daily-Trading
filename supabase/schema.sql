-- Bob Daily Trading — Supabase schema (Martin Luk Master System 4.0 Pro)
-- Run in Supabase SQL Editor

create extension if not exists "pgcrypto";

create table if not exists public.positions (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  asset_class text not null check (asset_class in ('equity', 'crypto')),
  side text not null default 'long',
  entry_price numeric not null,
  stop_loss numeric not null,
  qty numeric not null,
  account_equity numeric not null default 100000,
  notes text,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create index if not exists positions_status_idx on public.positions (status);
create index if not exists positions_symbol_idx on public.positions (symbol);

-- Optional: enable RLS with a single-user anon policy for personal dashboards
alter table public.positions enable row level security;

create policy "Allow all for service role" on public.positions
  for all
  using (true)
  with check (true);
