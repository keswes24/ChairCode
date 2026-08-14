-- ChairCode: tool maintenance tracker (step 6b)

create table public.tool_maintenance (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  task text not null,
  interval_weeks int not null,
  last_serviced_date date,
  created_at timestamptz not null default now()
);

alter table public.tool_maintenance enable row level security;

create policy "Barbers can view own tool maintenance"
  on public.tool_maintenance for select
  using (auth.uid() = barber_id);

create policy "Barbers can insert own tool maintenance"
  on public.tool_maintenance for insert
  with check (auth.uid() = barber_id);

create policy "Barbers can update own tool maintenance"
  on public.tool_maintenance for update
  using (auth.uid() = barber_id);

create policy "Barbers can delete own tool maintenance"
  on public.tool_maintenance for delete
  using (auth.uid() = barber_id);
