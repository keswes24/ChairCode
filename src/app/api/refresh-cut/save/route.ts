import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCheckoutCode } from "@/lib/chaircode/constants";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await request.json();
  const { originalCutId, photoPath, refreshZones, overallNotes } = body ?? {};
  if (!originalCutId || !photoPath || !refreshZones) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const { data: original } = await supabase
    .from("cuts")
    .select(
      "id, client_id, booked_barber_id, folder, style_name, suggested_tags, maintenance_weeks_min, maintenance_weeks_max",
    )
    .eq("id", originalCutId)
    .single();

  if (!original || (original.client_id !== user.id && original.booked_barber_id !== user.id)) {
    return NextResponse.json({ error: "Original cut not found." }, { status: 404 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isBarber = profile?.role === "barber";

  let checkoutCode = generateCheckoutCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: existing } = await supabase
      .from("cuts")
      .select("id")
      .eq("checkout_code", checkoutCode)
      .maybeSingle();
    if (!existing) break;
    checkoutCode = generateCheckoutCode();
  }

  const { data: saved, error: insertError } = await supabase
    .from("cuts")
    .insert({
      client_id: original.client_id,
      booked_barber_id: original.booked_barber_id,
      servicing_barber_id: isBarber ? user.id : null,
      folder: original.folder,
      photos: [{ path: photoPath, bucket: "cut-photos", zones: [] }],
      style_name: `${original.style_name} — Refresh`,
      breakdown: refreshZones,
      style_notes: overallNotes || null,
      suggested_tags: original.suggested_tags ?? [],
      maintenance_weeks_min: original.maintenance_weeks_min,
      maintenance_weeks_max: original.maintenance_weeks_max,
      checkout_code: checkoutCode,
      refresh_of_cut_id: original.id,
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: `Save failed: ${insertError.message}` }, { status: 500 });
  }

  return NextResponse.json({ id: saved.id });
}
