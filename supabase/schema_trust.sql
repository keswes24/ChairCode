-- ChairCode: trust/booking flow (step 6a)
-- Adds: booked_barber_id (who a cut is shared with), client_marked_booked
-- (the real unlock signal — NOT gated behind barber confirmation, per the
-- brief's §9), barber corrections/flags on client cuts, checkout-code
-- confirmation (optional), after-photo (the real "appointment happened"
-- signal), and post-appointment feedback.

alter table public.cuts
  add column booked_barber_id uuid references public.profiles (id) on delete set null,
  add column client_marked_booked boolean not null default false,
  add column barber_confirmed_via_code boolean not null default false,
  add column servicing_barber_id uuid references public.profiles (id) on delete set null,
  add column photo_consent boolean not null default false,
  add column after_photo_path text,
  add column feedback jsonb,
  add column corrected jsonb not null default '{}'::jsonb,
  add column flags jsonb not null default '{}'::jsonb;

-- Barbers can see (and act on) cuts a client has sent to them. The cut's
-- content (photo, breakdown) is visible as soon as it's sent — anonymity is
-- enforced separately, at the profiles level below, not here.
create policy "Barbers can view cuts sent to them"
  on public.cuts for select
  to authenticated
  using (booked_barber_id = auth.uid());

create policy "Barbers can update cuts sent to them"
  on public.cuts for update
  to authenticated
  using (booked_barber_id = auth.uid());

-- The actual anonymity mechanism: a barber can only read a client's name/
-- email once that client has self-reported booked with them specifically.
-- Until then, RLS blocks the join — there is no client identity to show,
-- not just a UI choice to hide it.
create policy "Barbers can view profiles of clients who booked with them"
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1 from public.cuts
      where cuts.client_id = profiles.id
        and cuts.booked_barber_id = auth.uid()
        and cuts.client_marked_booked = true
    )
  );

-- Barbers need to read a booked client's reference/after photos to do
-- corrections and confirm work. Scoped to clients who have an active
-- booked-barber relationship with this barber (not just any client).
create policy "Barbers can view photos of clients who sent them a cut"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'cut-photos'
    and exists (
      select 1 from public.cuts
      where cuts.client_id::text = (storage.foldername(name))[1]
        and cuts.booked_barber_id = auth.uid()
    )
  );

-- Barbers upload the after-photo themselves, into the client's folder.
create policy "Barbers can upload after-photos for their booked clients"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'cut-photos'
    and exists (
      select 1 from public.cuts
      where cuts.client_id::text = (storage.foldername(name))[1]
        and cuts.booked_barber_id = auth.uid()
    )
  );
