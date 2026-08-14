import type { SupabaseClient } from "@supabase/supabase-js";
import { ZONES } from "./constants";

const MAX_CORRECTION_EXAMPLES = 60;

// Every time a barber corrects a zone (Teach the AI, or correcting a
// client's submitted cut), log it if it meaningfully changed. This feeds
// the few-shot examples used on every future AI analysis call — per the
// brief, this is the actual differentiator, so keep this logic in one place.
export async function logCorrections(
  supabase: SupabaseClient,
  original: Record<string, string>,
  corrected: Record<string, string>,
): Promise<number> {
  const changedZones = ZONES.filter((z) => (original[z] ?? "").trim() !== (corrected[z] ?? "").trim());

  if (changedZones.length === 0) return 0;

  await supabase.from("correction_examples").insert(
    changedZones.map((z) => ({
      zone: z,
      before_text: original[z].trim(),
      after_text: corrected[z].trim(),
    })),
  );

  const { data: keepRows } = await supabase
    .from("correction_examples")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(MAX_CORRECTION_EXAMPLES);
  const keepIds = (keepRows ?? []).map((r) => r.id);
  if (keepIds.length === MAX_CORRECTION_EXAMPLES) {
    await supabase.from("correction_examples").delete().not("id", "in", `(${keepIds.join(",")})`);
  }

  return changedZones.length;
}
