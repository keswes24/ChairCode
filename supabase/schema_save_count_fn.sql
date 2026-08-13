-- ChairCode: safe save_count increment
-- The client saving a portfolio entry as their own cut isn't the entry's
-- owner, so the existing "barbers can update own entries" RLS policy blocks
-- a direct UPDATE. This function does one narrow, safe thing regardless of
-- caller, instead of widening the RLS policy.

create function public.increment_portfolio_save_count(entry_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.portfolio_entries
  set save_count = save_count + 1
  where id = entry_id;
end;
$$;

grant execute on function public.increment_portfolio_save_count(uuid) to authenticated;
