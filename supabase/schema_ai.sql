-- ChairCode: AI correction-learning table (step 2)
-- Run this once in the Supabase SQL Editor, alongside creating the "cut-photos"
-- storage bucket (private) from the dashboard.

create table public.correction_examples (
  id uuid primary key default gen_random_uuid(),
  zone text not null,
  before_text text not null,
  after_text text not null,
  created_at timestamptz not null default now()
);

alter table public.correction_examples enable row level security;

-- Any authenticated user can read examples (they're used server-side as
-- few-shot prompt context, not shown raw to end users).
create policy "Authenticated users can read correction examples"
  on public.correction_examples for select
  to authenticated
  using (true);

-- Storage policies for the cut-photos bucket: users can only read/write
-- files under a path prefixed with their own user id.
create policy "Users can upload their own cut photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'cut-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can read their own cut photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'cut-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
