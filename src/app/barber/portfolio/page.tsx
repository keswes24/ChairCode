import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolvePhotoUrl } from "@/lib/chaircode/photoUrl";
import PortfolioManager from "./PortfolioManager";

export default async function PortfolioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "barber") redirect("/client");

  const { data: barber } = await supabase
    .from("barbers")
    .select("booking_url, booth_type, city")
    .eq("id", user.id)
    .maybeSingle();

  const { data: entriesRaw } = await supabase
    .from("portfolio_entries")
    .select("id, title, tags, photo_path, verified, save_count, created_at")
    .eq("barber_id", user.id)
    .order("created_at", { ascending: false });

  const entries = await Promise.all(
    (entriesRaw ?? []).map(async (e) => ({
      ...e,
      photoUrl: await resolvePhotoUrl(supabase, { path: e.photo_path, bucket: "portfolio-photos" }),
    })),
  );

  return (
    <PortfolioManager
      barberId={user.id}
      fullName={profile.full_name}
      initialProfile={barber ?? { booking_url: "", booth_type: "", city: "" }}
      initialEntries={entries}
    />
  );
}
