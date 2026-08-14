import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ZONES, type Zone } from "@/lib/chaircode/constants";
import { logCorrections } from "@/lib/chaircode/logCorrections";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await request.json();
  const { cutId, correctedZones } = body ?? {};
  if (typeof cutId !== "string" || typeof correctedZones !== "object" || !correctedZones) {
    return NextResponse.json({ error: "Missing cutId or correctedZones." }, { status: 400 });
  }
  for (const z of ZONES) {
    if (typeof correctedZones[z] !== "string") {
      return NextResponse.json({ error: `Missing text for zone: ${z}` }, { status: 400 });
    }
  }

  const { data: cut } = await supabase
    .from("cuts")
    .select("id, booked_barber_id, breakdown")
    .eq("id", cutId)
    .single();

  if (!cut || cut.booked_barber_id !== user.id) {
    return NextResponse.json({ error: "Cut not found or not yours to correct." }, { status: 404 });
  }

  const original = cut.breakdown as Record<Zone, string>;
  const correctionsLogged = await logCorrections(supabase, original, correctedZones);

  const { error: updateError } = await supabase
    .from("cuts")
    .update({ corrected: correctedZones })
    .eq("id", cutId);

  if (updateError) {
    return NextResponse.json({ error: `Save failed: ${updateError.message}` }, { status: 500 });
  }

  return NextResponse.json({ correctionsLogged });
}
