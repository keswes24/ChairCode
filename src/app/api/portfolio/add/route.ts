import { NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { CONTROLLED_TAGS, ZONES } from "@/lib/chaircode/constants";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "barber") {
    return NextResponse.json({ error: "Only barbers can add portfolio entries." }, { status: 403 });
  }

  const formData = await request.formData();
  const photo = formData.get("photo");
  const title = formData.get("title");
  const templateName = formData.get("templateName");
  const styleNotes = formData.get("styleNotes");
  const zonesRaw = formData.get("zones");
  const tagsRaw = formData.get("tags");
  const verifiedRaw = formData.get("verified");

  if (!(photo instanceof File) || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Photo and title are required." }, { status: 400 });
  }
  if (photo.size > MAX_UPLOAD_BYTES || !photo.type.startsWith("image/")) {
    return NextResponse.json({ error: "Invalid photo." }, { status: 400 });
  }

  let zones: Record<string, string>;
  try {
    zones = JSON.parse(String(zonesRaw));
    for (const z of ZONES) {
      if (typeof zones[z] !== "string" || !zones[z].trim()) {
        throw new Error(`Missing text for zone: ${z}`);
      }
    }
  } catch (err) {
    return NextResponse.json({ error: `Invalid zone breakdown: ${(err as Error).message}` }, { status: 400 });
  }

  let tags: string[] = [];
  try {
    const parsed = JSON.parse(String(tagsRaw));
    if (Array.isArray(parsed)) {
      tags = parsed.filter((t) => (CONTROLLED_TAGS as readonly string[]).includes(t)).slice(0, 4);
    }
  } catch {
    tags = [];
  }

  const original = Buffer.from(await photo.arrayBuffer());
  const resized = await sharp(original)
    .rotate()
    .resize({ width: MAX_LONG_EDGE, height: MAX_LONG_EDGE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();

  const path = `${user.id}/${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("portfolio-photos")
    .upload(path, resized, { contentType: "image/jpeg" });
  if (uploadError) {
    return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("portfolio_entries")
    .insert({
      barber_id: user.id,
      title: title.trim(),
      tags,
      photo_path: path,
      template_name: typeof templateName === "string" && templateName ? templateName : null,
      custom_zones: zones,
      verified: verifiedRaw === "true",
      style_notes: typeof styleNotes === "string" && styleNotes.trim() ? styleNotes.trim() : null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: `Save failed: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
