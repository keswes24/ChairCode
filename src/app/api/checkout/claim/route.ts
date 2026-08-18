import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "barber") {
    return NextResponse.json({ error: "Only barbers can claim a checkout code." }, { status: 403 });
  }

  const { code } = await request.json();
  if (typeof code !== "string" || !code.trim()) {
    return NextResponse.json({ error: "Missing checkout code." }, { status: 400 });
  }
  const normalizedCode = code.trim().toUpperCase();

  // Uses the admin client because a barber legitimately claiming a
  // not-yet-claimed cut (booked_barber_id is null) can't satisfy the normal
  // RLS update policy, which only allows updating cuts already sent to them.
  // Knowing the exact checkout code is the authorization here — same model
  // as the brief's original "barber scans or types it to confirm" design.
  const admin = createAdminClient();
  const { data: cut } = await admin
    .from("cuts")
    .select("id")
    .eq("checkout_code", normalizedCode)
    .maybeSingle();

  if (!cut) {
    return NextResponse.json({ error: "No cut found for that code." }, { status: 404 });
  }

  const { error: updateError } = await admin
    .from("cuts")
    .update({ booked_barber_id: user.id, barber_confirmed_via_code: true })
    .eq("id", cut.id);

  if (updateError) {
    return NextResponse.json({ error: `Claim failed: ${updateError.message}` }, { status: 500 });
  }

  return NextResponse.json({ id: cut.id });
}
