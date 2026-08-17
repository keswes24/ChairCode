import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/Topbar";
import RefreshCutFlow from "@/components/RefreshCutFlow";

export default async function BarberRefreshCutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "barber") redirect("/client");

  const { data: cut } = await supabase
    .from("cuts")
    .select("id, style_name, after_photo_added_at, created_at")
    .eq("id", id)
    .eq("booked_barber_id", user.id)
    .single();

  if (!cut) notFound();

  const baseline = new Date(cut.after_photo_added_at ?? cut.created_at);
  const weeksElapsed = Math.max(0, Math.round((Date.now() - baseline.getTime()) / (7 * 86400000)));

  return (
    <div>
      <Topbar roleLabel="Barber" />
      <div style={{ padding: "0 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div className="stage-label">
          <div className="n">Barber</div>
          <h2>Refresh &ldquo;{cut.style_name}&rdquo;</h2>
        </div>
        <RefreshCutFlow cutId={cut.id} defaultWeeksElapsed={weeksElapsed} savedRedirectBase="/barber/inbox" />
      </div>
    </div>
  );
}
