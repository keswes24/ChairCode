import type { SupabaseClient } from "@supabase/supabase-js";

export type PhotoRef = {
  path: string;
  bucket?: "cut-photos" | "portfolio-photos";
};

export async function resolvePhotoUrl(
  supabase: SupabaseClient,
  photo: PhotoRef | undefined,
): Promise<string | null> {
  if (!photo?.path) return null;
  const bucket = photo.bucket ?? "cut-photos";

  if (bucket === "portfolio-photos") {
    return supabase.storage.from(bucket).getPublicUrl(photo.path).data.publicUrl;
  }

  const { data } = await supabase.storage.from(bucket).createSignedUrl(photo.path, 3600);
  return data?.signedUrl ?? null;
}
