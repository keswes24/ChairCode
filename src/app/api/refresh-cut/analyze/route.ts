import { NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { ZONES, type Zone } from "@/lib/chaircode/constants";
import { analyzeCutRefresh, type CorrectionExample } from "@/lib/anthropic/analyzeCut";

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
  const weeksElapsedRaw = formData.get("weeksElapsed");

  if (typeof cutId !== "string" || !(photo instanceof File)) {
    return NextResponse.json({ error: "Missing cutId or photo." }, { status: 400 });
  }
  const weeksElapsed = Number(weeksElapsedRaw);
  if (!Number.isFinite(weeksElapsed) || weeksElapsed < 0) {
    return NextResponse.json({ error: "Invalid weeksElapsed." }, { status: 400 });
  }
  if (photo.size > MAX_UPLOAD_BYTES || !photo.type.startsWith("image/")) {
    return NextResponse.json({ error: "Invalid photo." }, { status: 400 });
  }

  const { data: cut } = await supabase
    .from("cuts")
    .select("id, client_id, booked_barber_id, breakdown")
    .eq("id", cutId)
    .single();

  if (!cut || (cut.client_id !== user.id && cut.booked_barber_id !== user.id)) {
    return NextResponse.json({ error: "Cut not found." }, { status: 404 });
  }

  const originalZones = cut.breakdown as Record<Zone, string>;

  const original = Buffer.from(await photo.arrayBuffer());
  const resized = await sharp(original)
    .rotate()
    .resize({ width: MAX_LONG_EDGE, height: MAX_LONG_EDGE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();

  const path = `${cut.client_id}/refresh-${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("cut-photos")
    .upload(path, resized, { contentType: "image/jpeg" });
  if (uploadError) {
    return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 });
  }

  const { data: correctionRows } = await supabase
    .from("correction_examples")
    .select("zone, before_text, after_text")
    .order("created_at", { ascending: false })
    .limit(12);
  const corrections: CorrectionExample[] = correctionRows ?? [];

  let refresh;
  try {
    refresh = await analyzeCutRefresh({
      imageBase64: resized.toString("base64"),
      imageMediaType: "image/jpeg",
      originalZones,
      weeksElapsed,
      corrections,
    });
  } catch (err) {
    return NextResponse.json({ error: `AI analysis failed: ${(err as Error).message}` }, { status: 502 });
  }

  const { data: signedUrlData } = await supabase.storage.from("cut-photos").createSignedUrl(path, 3600);

  return NextResponse.json({
    refresh,
    photoPath: path,
    photoUrl: signedUrlData?.signedUrl ?? null,
    originalZones,
  });
}
