import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolvePhotoUrl } from "@/lib/chaircode/photoUrl";

export default async function PublicBarberProfile({
  params,
}: {
  params: Promise<{ barberId: string }>;
}) {
  const { barberId } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", barberId)
    .eq("role", "barber")
    .maybeSingle();

  if (!profile) notFound();

  const { data: barber } = await supabase
    .from("barbers")
    .select("booking_url, booth_type, city")
    .eq("id", barberId)
    .maybeSingle();

  const { data: entriesRaw } = await supabase
    .from("portfolio_entries")
    .select("id, title, tags, photo_path, verified")
    .eq("barber_id", barberId)
    .order("created_at", { ascending: false });

  const entries = await Promise.all(
    (entriesRaw ?? []).map(async (e) => ({
      ...e,
      photoUrl: await resolvePhotoUrl(supabase, { path: e.photo_path, bucket: "portfolio-photos" }),
    })),
  );

  return (
    <div style={{ padding: "0 24px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ padding: "22px 0 18px", borderBottom: "1px solid var(--line)", marginBottom: 36 }}>
        <div className="display" style={{ fontSize: 28 }}>
          Chair<span style={{ color: "var(--gold)" }}>Code</span>
        </div>
      </div>

      <h1 className="display" style={{ fontSize: 44, marginBottom: 8 }}>
        {profile.full_name}
      </h1>
      <p style={{ color: "var(--ivory-dim)", marginBottom: 8 }}>
        {[barber?.city, barber?.booth_type].filter(Boolean).join(" · ") || "Barber"}
      </p>
      {barber?.booking_url && (
        <a href={barber.booking_url} target="_blank" rel="noopener noreferrer" className="btn btn-gold" style={{ marginBottom: 30, display: "inline-flex" }}>
          Book with {profile.full_name} →
        </a>
      )}

      <div className="divider-line" style={{ height: 1, background: "var(--line)", margin: "20px 0 30px" }} />

      {entries.length === 0 ? (
        <div className="empty-state">
          <h3>No portfolio cuts yet</h3>
        </div>
      ) : (
        <div className="cut-thumb-grid">
          {entries.map((e) => (
            <div key={e.id} className="cut-thumb">
              {e.photoUrl && <img src={e.photoUrl} alt={e.title} />}
              <div className="cap">
                {e.verified && <span style={{ color: "var(--gold-bright)" }}>✓ Verified · </span>}
                {e.title}
                <br />
                {e.tags.join(", ")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
