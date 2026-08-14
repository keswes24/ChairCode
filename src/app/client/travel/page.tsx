import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolvePhotoUrl } from "@/lib/chaircode/photoUrl";
import { embeddedOne } from "@/lib/chaircode/embeddedOne";
import { Topbar } from "@/components/Topbar";

export default async function TravelFinderPage({
  searchParams,
}: {
  searchParams: Promise<{ cutId?: string; city?: string }>;
}) {
  const { cutId, city } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "client") redirect("/barber");

  if (!cutId) {
    const { data: myCuts } = await supabase
      .from("cuts")
      .select("id, style_name, photos")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false });

    const cuts = await Promise.all(
      (myCuts ?? []).map(async (c) => ({
        ...c,
        thumbUrl: await resolvePhotoUrl(
          supabase,
          (c.photos as { path: string; bucket?: "cut-photos" | "portfolio-photos" }[])?.[0],
        ),
      })),
    );

    return (
      <div>
        <Topbar roleLabel="Client" />
        <div style={{ padding: "0 24px", maxWidth: 1100, margin: "0 auto" }}>
          <div className="stage-label">
            <div className="n">Client</div>
            <h2>Travel finder</h2>
          </div>
          <p style={{ color: "var(--ivory-dim)", fontSize: 14, marginBottom: 24, maxWidth: 560, lineHeight: 1.6 }}>
            Pick one of your saved cuts, and we&rsquo;ll find barbers whose work matches the same style —
            useful if you&rsquo;re traveling or your usual barber isn&rsquo;t available.
          </p>
          {cuts.length === 0 ? (
            <div className="empty-state">
              <h3>No saved cuts yet</h3>
              <p>Save a cut first, then come back here to find a matching barber elsewhere.</p>
            </div>
          ) : (
            <div className="cut-thumb-grid">
              {cuts.map((c) => (
                <Link key={c.id} href={`/client/travel?cutId=${c.id}`} className="cut-thumb">
                  {c.thumbUrl && <img src={c.thumbUrl} alt={c.style_name} />}
                  <div className="cap">{c.style_name}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const { data: sourceCut } = await supabase
    .from("cuts")
    .select("id, style_name, suggested_tags")
    .eq("id", cutId)
    .eq("client_id", user.id)
    .single();

  if (!sourceCut) notFound();

  const tags = sourceCut.suggested_tags as string[];

  let query = supabase
    .from("portfolio_entries")
    .select("id, title, tags, photo_path, verified, barber_id")
    .order("created_at", { ascending: false });

  if (tags.length > 0) query = query.overlaps("tags", tags);

  const { data: entriesRaw } = await query;

  const barberIds = [...new Set((entriesRaw ?? []).map((e) => e.barber_id))];
  const { data: barberRows } = barberIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, barbers(city)")
        .in("id", barberIds)
    : { data: [] };
  const barberById = new Map(
    (barberRows ?? []).map((b) => [
      b.id,
      {
        name: b.full_name,
        city: embeddedOne(b.barbers as { city: string | null } | { city: string | null }[] | null)?.city ?? null,
      },
    ]),
  );

  let entries = await Promise.all(
    (entriesRaw ?? []).map(async (e) => ({
      ...e,
      photoUrl: await resolvePhotoUrl(supabase, { path: e.photo_path, bucket: "portfolio-photos" }),
      barberName: barberById.get(e.barber_id)?.name ?? "Barber",
      barberCity: barberById.get(e.barber_id)?.city ?? null,
    })),
  );

  if (city) {
    const needle = city.toLowerCase();
    entries = entries.filter((e) => e.barberCity?.toLowerCase().includes(needle));
  }

  return (
    <div>
      <Topbar roleLabel="Client" />
      <div style={{ padding: "0 24px", maxWidth: 1100, margin: "0 auto" }}>
        <Link
          href="/client/travel"
          style={{ display: "inline-flex", marginBottom: 20, color: "var(--ivory-dim)", fontSize: 13 }}
        >
          ← Pick a different cut
        </Link>
        <div className="stage-label">
          <div className="n">Client</div>
          <h2>Matches for &ldquo;{sourceCut.style_name}&rdquo;</h2>
        </div>

        <form method="get" style={{ marginBottom: 24, display: "flex", gap: 10 }}>
          <input type="hidden" name="cutId" value={cutId} />
          <input
            type="text"
            name="city"
            defaultValue={city ?? ""}
            placeholder="Filter by city (optional)"
            style={{ maxWidth: 280 }}
          />
          <button type="submit" className="btn btn-sm">
            Filter
          </button>
        </form>

        {entries.length === 0 ? (
          <div className="empty-state">
            <h3>No matches found</h3>
            <p>Try clearing the city filter, or check back as more barbers join.</p>
          </div>
        ) : (
          <div className="cut-thumb-grid">
            {entries.map((e) => (
              <Link key={e.id} href={`/client/browse/${e.id}`} className="cut-thumb">
                {e.photoUrl && <img src={e.photoUrl} alt={e.title} />}
                <div className="cap">
                  {e.verified && <span style={{ color: "var(--gold-bright)" }}>✓ </span>}
                  {e.title}
                  <br />
                  by {e.barberName}
                  {e.barberCity ? ` · ${e.barberCity}` : ""}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
