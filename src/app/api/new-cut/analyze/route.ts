import { NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import {
  analyzeCutPhoto,
  type CorrectionExample,
  type CutBreakdown,
} from "@/lib/anthropic/analyzeCut";
import { CONTROLLED_TAGS, ZONES, type Zone } from "@/lib/chaircode/constants";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_LONG_EDGE = 1024;
const MAX_PHOTOS = 5;

type UploadedPhoto = {
  index: number;
  path: string;
  url: string | null;
  zones: Zone[];
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const formData = await request.formData();
  const description = formData.get("description");

  const files: File[] = [];
  const zoneClaims: Zone[][] = [];
  for (let i = 0; i < MAX_PHOTOS; i++) {
    const file = formData.get(`photo_${i}`);
    if (!(file instanceof File)) break;
    files.push(file);
    const rawZones = formData.get(`zones_${i}`);
    let zones: Zone[] = [];
    if (typeof rawZones === "string") {
      try {
        const parsed = JSON.parse(rawZones);
        if (Array.isArray(parsed)) {
          zones = parsed.filter((z): z is Zone => ZONES.includes(z));
        }
      } catch {
        // ignore malformed zone claims, treat as unclaimed
      }
    }
    zoneClaims.push(zones);
  }

  if (files.length === 0) {
    return NextResponse.json({ error: "At least one photo is required." }, { status: 400 });
  }
  for (const f of files) {
    if (f.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "One or more photos are too large." }, { status: 400 });
    }
    if (!f.type.startsWith("image/")) {
      return NextResponse.json({ error: "All files must be images." }, { status: 400 });
    }
  }

  // Resolve final zone -> photo index. Any zone not explicitly claimed by a
  // non-primary photo falls back to the primary (first) photo.
  const zoneOwner = new Map<Zone, number>();
  for (const zone of ZONES) zoneOwner.set(zone, 0);
  zoneClaims.forEach((zones, photoIndex) => {
    if (photoIndex === 0) return;
    zones.forEach((zone) => zoneOwner.set(zone, photoIndex));
  });

  const { data: correctionRows } = await supabase
    .from("correction_examples")
    .select("zone, before_text, after_text")
    .order("created_at", { ascending: false })
    .limit(12);
  const corrections: CorrectionExample[] = correctionRows ?? [];

  let resizedBuffers: Buffer[];
  try {
    resizedBuffers = await Promise.all(
      files.map(async (file) => {
        const original = Buffer.from(await file.arrayBuffer());
        return sharp(original)
          .rotate()
          .resize({
            width: MAX_LONG_EDGE,
            height: MAX_LONG_EDGE,
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({ quality: 82 })
          .toBuffer();
      }),
    );
  } catch (err) {
    console.error(
      "[new-cut/analyze] image processing failed",
      files.map((f) => ({ name: f.name, type: f.type, size: f.size })),
      err,
    );
    return NextResponse.json(
      { error: `Image processing failed: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  const uploaded: UploadedPhoto[] = [];
  for (let i = 0; i < resizedBuffers.length; i++) {
    const path = `${user.id}/${Date.now()}-${i}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("cut-photos")
      .upload(path, resizedBuffers[i], { contentType: "image/jpeg" });
    if (uploadError) {
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadError.message}` },
        { status: 500 },
      );
    }
    const { data: signedUrlData } = await supabase.storage
      .from("cut-photos")
      .createSignedUrl(path, 3600);
    uploaded.push({
      index: i,
      path,
      url: signedUrlData?.signedUrl ?? null,
      zones: zoneClaims[i],
    });
  }

  let analyses: CutBreakdown[];
  try {
    analyses = await Promise.all(
      resizedBuffers.map((buf) =>
        analyzeCutPhoto({
          imageBase64: buf.toString("base64"),
          imageMediaType: "image/jpeg",
          freeTextDescription: typeof description === "string" ? description : undefined,
          corrections,
        }),
      ),
    );
  } catch (err) {
    console.error("[new-cut/analyze] AI analysis failed", err);
    return NextResponse.json(
      { error: `AI analysis failed: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  const primary = analyses[0];
  const mergedZones = Object.fromEntries(
    ZONES.map((zone) => [zone, analyses[zoneOwner.get(zone) ?? 0].zones[zone]]),
  ) as CutBreakdown["zones"];

  const tagSet = new Set<string>();
  analyses.forEach((a) => a.suggestedTags.forEach((t) => tagSet.add(t)));
  const suggestedTags = [...tagSet].filter((t) => (CONTROLLED_TAGS as readonly string[]).includes(t)).slice(0, 4);

  const productSet = new Set<string>();
  analyses.forEach((a) => a.products.forEach((p) => productSet.add(p)));

  return NextResponse.json({
    photos: uploaded,
    breakdown: {
      styleName: primary.styleName,
      filtered: analyses.some((a) => a.filtered),
      zones: mergedZones,
      products: [...productSet].slice(0, 6),
      maintenanceWeeksMin: primary.maintenanceWeeksMin,
      maintenanceWeeksMax: primary.maintenanceWeeksMax,
      suggestedTags,
    },
  });
}
