import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCheckoutCode } from "@/lib/chaircode/constants";
import { STYLE_TEMPLATES } from "@/lib/chaircode/templates";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await request.json();
  const { portfolioEntryId, folder } = body ?? {};
  if (!portfolioEntryId) {
    return NextResponse.json({ error: "Missing portfolioEntryId." }, { status: 400 });
  }

  const { data: entry, error: fetchError } = await supabase
    .from("portfolio_entries")
    .select("id, barber_id, title, tags, photo_path, template_name, custom_zones")
    .eq("id", portfolioEntryId)
    .single();

  if (fetchError || !entry) {
    return NextResponse.json({ error: "Portfolio entry not found." }, { status: 404 });
  }

  const templateFallback = STYLE_TEMPLATES.find((t) => t.name === entry.template_name);
  const breakdown = entry.custom_zones ?? templateFallback?.zones;
  if (!breakdown) {
    return NextResponse.json({ error: "This entry has no breakdown to copy." }, { status: 500 });
  }

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
      client_id: user.id,
      folder: folder || "Current",
      photos: [{ path: entry.photo_path, bucket: "portfolio-photos", zones: [] }],
      style_name: entry.title,
      breakdown,
      suggested_tags: entry.tags ?? [],
      checkout_code: checkoutCode,
      source_portfolio_id: entry.id,
      source_barber_id: entry.barber_id,
      // Browsing a specific barber's work implies intent to book with them —
      // route it to their inbox automatically instead of making the client
      // pick a barber again for a cut that already came from one.
      booked_barber_id: entry.barber_id,
    })
    .select("id, checkout_code")
    .single();

  if (insertError) {
    return NextResponse.json({ error: `Save failed: ${insertError.message}` }, { status: 500 });
  }

  // RLS blocks a direct UPDATE here (client isn't the entry's owner), so this
  // goes through a narrow SECURITY DEFINER function instead.
  await supabase.rpc("increment_portfolio_save_count", { entry_id: entry.id });

  return NextResponse.json({ id: saved.id, checkoutCode: saved.checkout_code });
}
