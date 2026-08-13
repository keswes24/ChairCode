-- ChairCode: allow public read of barber profiles only (not clients)
-- Needed for the public /b/[barberId] page, which is meant to work without
-- login. Client profiles stay private — this policy is scoped to role='barber'.

create policy "Anyone can view barber profiles"
  on public.profiles for select
  to public
  using (role = 'barber');
