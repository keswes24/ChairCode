-- ChairCode: cuts table (step 3 — Core New Cut flow)
-- Run this once in the Supabase SQL Editor.

create table public.cuts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  folder text not null default 'Current',
  photos jsonb not null default '[]'::jsonb, -- [{ path, url, zones: string[] }]
  style_name text not null,
  breakdown jsonb not null, -- { front, crown, sideburns, sides, neckline, back, general }
  style_notes text,
  suggested_tags text[] not null default '{}',
  products text[] not null default '{}',
  maintenance_weeks_min int,
  maintenance_weeks_max int,
  next_maintenance_due date,
  checkout_code text not null unique,
  filtered boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.cuts enable row level security;

create policy "Clients can view own cuts"
  on public.cuts for select
  using (auth.uid() = client_id);

create policy "Clients can insert own cuts"
  on public.cuts for insert
  with check (auth.uid() = client_id);

create policy "Clients can update own cuts"
  on public.cuts for update
  using (auth.uid() = client_id);
