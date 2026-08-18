-- ChairCode: parent/child profiles (minimal fields per the brief's §9
-- privacy guidance — name + broad age range only, both optional).
-- NOTE: this still needs real legal/privacy review (COPPA-adjacent) before
-- being relied on with real family data — this migration only builds the
-- minimal-data-collection version the brief specified, not a legal sign-off.

create table public.child_profiles (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles (id) on delete cascade,
  name text,
  age_range text,
  created_at timestamptz not null default now()
);

alter table public.child_profiles enable row level security;

create policy "Clients can view own child profiles"
  on public.child_profiles for select
  using (auth.uid() = parent_id);

create policy "Clients can insert own child profiles"
  on public.child_profiles for insert
  with check (auth.uid() = parent_id);

create policy "Clients can update own child profiles"
  on public.child_profiles for update
  using (auth.uid() = parent_id);

create policy "Clients can delete own child profiles"
  on public.child_profiles for delete
  using (auth.uid() = parent_id);

alter table public.cuts
  add column for_child_id uuid references public.child_profiles (id) on delete set null;
