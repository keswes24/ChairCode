-- ChairCode: allow barbers to write correction_examples (step 5)
-- schema_ai.sql only granted SELECT on this table. Teach the AI needs to
-- INSERT new corrections and DELETE old ones past the most-recent-60 cap.

create policy "Barbers can insert correction examples"
  on public.correction_examples for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'barber')
  );

create policy "Barbers can delete correction examples"
  on public.correction_examples for delete
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'barber')
  );
