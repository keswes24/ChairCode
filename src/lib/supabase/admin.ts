import { createClient } from "@supabase/supabase-js";

// Service-role client: bypasses RLS entirely. Only use this in trusted,
// server-only code that legitimately needs to act across all users — e.g.
// the cron job that scans every client's cuts, not a single authenticated
// user's own rows. Never import this into anything reachable from the browser.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
