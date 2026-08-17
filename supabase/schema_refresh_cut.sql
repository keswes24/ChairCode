-- ChairCode: "Refresh this cut" feature
-- Links a new in-chair touch-up visit back to the original cut it's
-- refreshing, so visit history chains together.

alter table public.cuts
  add column refresh_of_cut_id uuid references public.cuts (id) on delete set null;
