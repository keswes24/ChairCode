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
  const { photos, breakdown, styleNotes, folder } = body ?? {};

  if (!photos || !breakdown) {
    return NextResponse.json({ error: "Missing photos or breakdown." }, { status: 400 });
  }

  const avgWeeks =
    ((breakdown.maintenanceWeeksMin ?? 4) + (breakdown.maintenanceWeeksMax ?? 6)) / 2;
  const nextMaintenanceDue = new Date(
    Date.now() + avgWeeks * 7 * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .slice(0, 10);

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

  const { data, error } = await supabase
    .from("cuts")
    .insert({
      client_id: user.id,
      folder: folder || "Current",
      photos,
      style_name: breakdown.styleName,
      breakdown: breakdown.zones,
      style_notes: styleNotes || null,
      suggested_tags: breakdown.suggestedTags ?? [],
      products: breakdown.products ?? [],
      maintenance_weeks_min: breakdown.maintenanceWeeksMin ?? null,
      maintenance_weeks_max: breakdown.maintenanceWeeksMax ?? null,
      next_maintenance_due: nextMaintenanceDue,
      checkout_code: checkoutCode,
      filtered: !!breakdown.filtered,
    })
    .select("id, checkout_code")
    .single();

  if (error) {
    return NextResponse.json({ error: `Save failed: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, checkoutCode: data.checkout_code });
}
