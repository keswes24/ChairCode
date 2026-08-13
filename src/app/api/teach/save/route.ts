import { NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { CONTROLLED_TAGS, ZONES } from "@/lib/chaircode/constants";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_LONG_EDGE = 1024;
const MAX_CORRECTION_EXAMPLES = 60;

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
    return NextResponse.json({ error: "Only barbers can teach the AI." }, { status: 403 });
  }

  const formData = await request.formData();
  const originalRaw = formData.get("originalZones");
  const correctedRaw = formData.get("correctedZones");
  const addToPortfolio = formData.get("addToPortfolio") === "true";
  const photo = formData.get("photo");
  const title = formData.get("title");
  const tagsRaw = formData.get("tags");
  const styleNotes = formData.get("styleNotes");

  let original: Record<string, string>;
  let corrected: Record<string, string>;
  try {
    original = JSON.parse(String(originalRaw));
    corrected = JSON.parse(String(correctedRaw));
    for (const z of ZONES) {
      if (typeof original[z] !== "string" || typeof corrected[z] !== "string") {
        throw new Error(`Missing text for zone: ${z}`);
      }
    }
  } catch (err) {
    return NextResponse.json({ error: `Invalid zone data: ${(err as Error).message}` }, { status: 400 });
  }

  const changedZones = ZONES.filter((z) => original[z].trim() !== corrected[z].trim());

  if (changedZones.length > 0) {
    const { error: insertError } = await supabase.from("correction_examples").insert(
      changedZones.map((z) => ({
        zone: z,
        before_text: original[z].trim(),
        after_text: corrected[z].trim(),
      })),
    );
    if (insertError) {
      return NextResponse.json({ error: `Logging corrections failed: ${insertError.message}` }, { status: 500 });
    }

    // Keep only the most recent MAX_CORRECTION_EXAMPLES rows, per the brief's spec.
    const { data: keepRows } = await supabase
      .from("correction_examples")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(MAX_CORRECTION_EXAMPLES);
    const keepIds = (keepRows ?? []).map((r) => r.id);
    if (keepIds.length === MAX_CORRECTION_EXAMPLES) {
      await supabase.from("correction_examples").delete().not("id", "in", `(${keepIds.join(",")})`);
    }
  }

  let portfolioEntryId: string | null = null;
  if (addToPortfolio) {
    if (!(photo instanceof File) || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "Photo and title are required to add this to your portfolio." },
        { status: 400 },
      );
    }
    if (photo.size > MAX_UPLOAD_BYTES || !photo.type.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid photo." }, { status: 400 });
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

    const original_ = Buffer.from(await photo.arrayBuffer());
    const resized = await sharp(original_)
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

    const { data: entry, error: entryError } = await supabase
      .from("portfolio_entries")
      .insert({
        barber_id: user.id,
        title: title.trim(),
        tags,
        photo_path: path,
        template_name: null,
        custom_zones: corrected,
        verified: true, // real, barber-corrected work — always verified
        style_notes: typeof styleNotes === "string" && styleNotes.trim() ? styleNotes.trim() : null,
      })
      .select("id")
      .single();

    if (entryError) {
      return NextResponse.json({ error: `Portfolio save failed: ${entryError.message}` }, { status: 500 });
    }
    portfolioEntryId = entry.id;
  }

  return NextResponse.json({ correctionsLogged: changedZones.length, portfolioEntryId });
}
