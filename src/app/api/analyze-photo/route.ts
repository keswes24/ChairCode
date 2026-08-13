import { NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { analyzeCutPhoto, type CorrectionExample } from "@/lib/anthropic/analyzeCut";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB raw upload cap, before downscaling
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
  const photo = formData.get("photo");
  const description = formData.get("description");

  if (!(photo instanceof File)) {
    return NextResponse.json({ error: "Missing photo file." }, { status: 400 });
  }
  if (photo.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Photo is too large." }, { status: 400 });
  }
  if (!photo.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image." }, { status: 400 });
  }

  const originalBytes = Buffer.from(await photo.arrayBuffer());

  // Downscale to max 1024px on the long edge, JPEG quality ~0.82 — phone
  // photos are multi-MB and this avoids request-size failures.
  const resized = await sharp(originalBytes)
    .rotate() // apply EXIF orientation before resizing
    .resize({
      width: MAX_LONG_EDGE,
      height: MAX_LONG_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 82 })
    .toBuffer();

  const path = `${user.id}/${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("cut-photos")
    .upload(path, resized, { contentType: "image/jpeg" });

  if (uploadError) {
    return NextResponse.json(
      { error: `Storage upload failed: ${uploadError.message}` },
      { status: 500 },
    );
  }

  const { data: correctionRows } = await supabase
    .from("correction_examples")
    .select("zone, before_text, after_text")
    .order("created_at", { ascending: false })
    .limit(12);

  const corrections: CorrectionExample[] = correctionRows ?? [];

  let breakdown;
  try {
    breakdown = await analyzeCutPhoto({
      imageBase64: resized.toString("base64"),
      imageMediaType: "image/jpeg",
      freeTextDescription: typeof description === "string" ? description : undefined,
      corrections,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `AI analysis failed: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  const { data: signedUrlData } = await supabase.storage
    .from("cut-photos")
    .createSignedUrl(path, 3600);

  return NextResponse.json({
    breakdown,
    photoPath: path,
    photoUrl: signedUrlData?.signedUrl ?? null,
  });
}
