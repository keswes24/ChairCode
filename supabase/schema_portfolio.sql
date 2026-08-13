-- ChairCode: barbers + portfolio_entries (step 4 — Portfolio + Browse)
-- Run this once in the Supabase SQL Editor. Also create a PUBLIC storage
-- bucket named "portfolio-photos" from the dashboard (Storage -> New bucket,
-- toggle Public ON) — portfolio content is meant to be publicly discoverable,
-- unlike client consultation photos in the private "cut-photos" bucket.

create table public.barbers (
  id uuid primary key references public.profiles (id) on delete cascade,
  booking_url text,
  booth_type text, -- 'Independent booth' | 'Shop-based — {name}'
  city text
);

alter table public.barbers enable row level security;

-- Public profile pages need to be viewable without login.
create policy "Anyone can view barber profiles"
  on public.barbers for select
  to public
  using (true);

create policy "Barbers can upsert own profile"
  on public.barbers for insert
  with check (auth.uid() = id);

create policy "Barbers can update own profile"
  on public.barbers for update
  using (auth.uid() = id);

create table public.portfolio_entries (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  tags text[] not null default '{}',
  photo_path text not null,
  template_name text,
  custom_zones jsonb, -- null = falls back to the base template's zone text
  verified boolean not null default false,
  style_notes text,
  save_count int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.portfolio_entries enable row level security;

create policy "Anyone can view portfolio entries"
  on public.portfolio_entries for select
  to public
  using (true);

create policy "Barbers can insert own portfolio entries"
  on public.portfolio_entries for insert
  with check (auth.uid() = barber_id);

create policy "Barbers can update own portfolio entries"
  on public.portfolio_entries for update
  using (auth.uid() = barber_id);

create policy "Barbers can delete own portfolio entries"
  on public.portfolio_entries for delete
  using (auth.uid() = barber_id);

-- Storage policy for the public portfolio-photos bucket: only the owning
-- barber can upload under their own folder prefix; reads are public (bucket-level).
create policy "Barbers can upload their own portfolio photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'portfolio-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Cuts saved from a browsed portfolio entry (client_id already exists on cuts).
alter table public.cuts
  add column source_portfolio_id uuid references public.portfolio_entries (id) on delete set null,
  add column source_barber_id uuid references public.profiles (id) on delete set null;
