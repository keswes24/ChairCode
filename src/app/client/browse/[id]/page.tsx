import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolvePhotoUrl } from "@/lib/chaircode/photoUrl";
import { ZONES, type Zone } from "@/lib/chaircode/constants";
import { STYLE_TEMPLATES } from "@/lib/chaircode/templates";
import { Topbar } from "@/components/Topbar";
import SaveEntryActions from "./SaveEntryActions";

const ZONE_LABELS: Record<Zone, string> = {
  front: "Front",
  crown: "Crown",
  sideburns: "Sideburns",
  sides: "Sides",
  neckline: "Neckline",
  back: "Back",
  general: "General",
};

export default async function BrowseEntryPage({
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

  const { data: entry } = await supabase
    .from("portfolio_entries")
    .select("id, title, tags, photo_path, verified, template_name, custom_zones, barber_id, style_notes")
    .eq("id", id)
    .single();

  if (!entry) notFound();

  const { data: barberProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", entry.barber_id)
    .single();
  const { data: barber } = await supabase
    .from("barbers")
    .select("booking_url, city, booth_type")
    .eq("id", entry.barber_id)
    .maybeSingle();

  const photoUrl = await resolvePhotoUrl(supabase, { path: entry.photo_path, bucket: "portfolio-photos" });
  const templateFallback = STYLE_TEMPLATES.find((t) => t.name === entry.template_name);
  const breakdown = (entry.custom_zones as Record<Zone, string> | null) ?? templateFallback?.zones;

  return (
    <div>
      <Topbar roleLabel="Client" />
      <div style={{ padding: "0 24px", maxWidth: 1100, margin: "0 auto" }}>
        <Link href="/client/browse" style={{ display: "inline-flex", marginBottom: 20, color: "var(--ivory-dim)", fontSize: 13 }}>
          ← Browse
        </Link>
        <div className="split">
          <div>
            <div className="photo-card">
              {photoUrl && <img src={photoUrl} alt={entry.title} />}
              <div className="meta">
                <div className="name">{entry.title}</div>
                <div className="tag">
                  {entry.verified ? "Barber-verified" : "Template-based"} · by {barberProfile?.full_name}
                </div>
              </div>
            </div>
            <p style={{ color: "var(--ivory-dim)", fontSize: 13, marginTop: 14 }}>
              {[barber?.city, barber?.booth_type].filter(Boolean).join(" · ")}
            </p>
            {barber?.booking_url && (
              <a href={barber.booking_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{ marginTop: 10, display: "inline-flex" }}>
                Booking link →
              </a>
            )}
          </div>
          <div>
            <div className="stage-label">
              <div className="n">Browse</div>
              <h2>Breakdown</h2>
            </div>
            {breakdown ? (
              ZONES.map((z) => (
                <div className="zone-card" key={z}>
                  <div>
                    <div className="zlabel">{ZONE_LABELS[z]}</div>
                  </div>
                  <div className="ztext">{breakdown[z]}</div>
                </div>
              ))
            ) : (
              <p style={{ color: "var(--ivory-dim)" }}>No breakdown available for this entry.</p>
            )}
            <SaveEntryActions portfolioEntryId={entry.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
