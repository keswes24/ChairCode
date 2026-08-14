import { NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_LONG_EDGE = 1024;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const formData = await request.formData();
  const cutId = formData.get("cutId");
  const photo = formData.get("photo");

  if (typeof cutId !== "string" || !(photo instanceof File)) {
    return NextResponse.json({ error: "Missing cutId or photo." }, { status: 400 });
  }
  if (photo.size > MAX_UPLOAD_BYTES || !photo.type.startsWith("image/")) {
    return NextResponse.json({ error: "Invalid photo." }, { status: 400 });
  }

  const { data: cut } = await supabase
    .from("cuts")
    .select("id, client_id, booked_barber_id, maintenance_weeks_min")
    .eq("id", cutId)
    .single();

  if (!cut || cut.booked_barber_id !== user.id) {
    return NextResponse.json({ error: "Cut not found or not yours to service." }, { status: 404 });
  }

  const original = Buffer.from(await photo.arrayBuffer());
  const resized = await sharp(original)
    .rotate()
    .resize({ width: MAX_LONG_EDGE, height: MAX_LONG_EDGE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();

  const path = `${cut.client_id}/after-${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("cut-photos")
    .upload(path, resized, { contentType: "image/jpeg" });
  if (uploadError) {
    return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 });
  }

  // Restart the maintenance countdown from today — the real appointment date —
  // instead of whenever the reference photo was originally saved.
  const weeks = cut.maintenance_weeks_min ?? 4;
  const nextDue = new Date();
  nextDue.setDate(nextDue.getDate() + weeks * 7);

  const { error: updateError } = await supabase
    .from("cuts")
    .update({
      after_photo_path: path,
      after_photo_added_at: new Date().toISOString(),
      servicing_barber_id: user.id,
      next_maintenance_due: nextDue.toISOString().slice(0, 10),
    })
    .eq("id", cutId);

  if (updateError) {
    return NextResponse.json({ error: `Update failed: ${updateError.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
