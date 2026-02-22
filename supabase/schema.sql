-- Run this in Supabase SQL editor

create extension if not exists pgcrypto;

create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Main Portfolio',
  base_currency text not null default 'SEK',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.holdings (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  symbol text not null,
  name text not null,
  market_value numeric not null,
  category text not null check (category in ('stock', 'etf', 'crypto', 'cash', 'bond')),
  currency text not null default 'SEK',
  logo_url text,
  brand_color text,
  text_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(portfolio_id, symbol)
);

create table if not exists public.instrument_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  logo_url text,
  brand_color text,
  text_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, symbol)
);

create index if not exists idx_portfolios_user on public.portfolios(user_id);
create index if not exists idx_holdings_portfolio on public.holdings(portfolio_id);
create index if not exists idx_instrument_overrides_user on public.instrument_overrides(user_id);

alter table public.portfolios enable row level security;
alter table public.holdings enable row level security;
alter table public.instrument_overrides enable row level security;

drop policy if exists portfolios_select_own on public.portfolios;
drop policy if exists portfolios_insert_own on public.portfolios;
drop policy if exists portfolios_update_own on public.portfolios;
drop policy if exists portfolios_delete_own on public.portfolios;

create policy portfolios_select_own
on public.portfolios
for select
using (auth.uid() = user_id);

create policy portfolios_insert_own
on public.portfolios
for insert
with check (auth.uid() = user_id);

create policy portfolios_update_own
on public.portfolios
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy portfolios_delete_own
on public.portfolios
for delete
using (auth.uid() = user_id);

drop policy if exists holdings_select_own on public.holdings;
drop policy if exists holdings_insert_own on public.holdings;
drop policy if exists holdings_update_own on public.holdings;
drop policy if exists holdings_delete_own on public.holdings;

create policy holdings_select_own
on public.holdings
for select
using (
  exists (
    select 1
    from public.portfolios p
    where p.id = holdings.portfolio_id
      and p.user_id = auth.uid()
  )
);

create policy holdings_insert_own
on public.holdings
for insert
with check (
  exists (
    select 1
    from public.portfolios p
    where p.id = holdings.portfolio_id
      and p.user_id = auth.uid()
  )
);

create policy holdings_update_own
on public.holdings
for update
using (
  exists (
    select 1
    from public.portfolios p
    where p.id = holdings.portfolio_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.portfolios p
    where p.id = holdings.portfolio_id
      and p.user_id = auth.uid()
  )
);

create policy holdings_delete_own
on public.holdings
for delete
using (
  exists (
    select 1
    from public.portfolios p
    where p.id = holdings.portfolio_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists instrument_overrides_select_own on public.instrument_overrides;
drop policy if exists instrument_overrides_insert_own on public.instrument_overrides;
drop policy if exists instrument_overrides_update_own on public.instrument_overrides;
drop policy if exists instrument_overrides_delete_own on public.instrument_overrides;

create policy instrument_overrides_select_own
on public.instrument_overrides
for select
using (auth.uid() = user_id);

create policy instrument_overrides_insert_own
on public.instrument_overrides
for insert
with check (auth.uid() = user_id);

create policy instrument_overrides_update_own
on public.instrument_overrides
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy instrument_overrides_delete_own
on public.instrument_overrides
for delete
using (auth.uid() = user_id);
