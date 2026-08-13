import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolvePhotoUrl } from "@/lib/chaircode/photoUrl";
import { CONTROLLED_TAGS } from "@/lib/chaircode/constants";
import { Topbar } from "@/components/Topbar";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const { q, tag } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "client") redirect("/barber");

  let query = supabase
    .from("portfolio_entries")
    .select("id, title, tags, photo_path, verified, barber_id")
    .order("created_at", { ascending: false });

  if (q) query = query.ilike("title", `%${q}%`);
  if (tag) query = query.contains("tags", [tag]);

  const { data: entriesRaw } = await query;

  const barberIds = [...new Set((entriesRaw ?? []).map((e) => e.barber_id))];
  const { data: barberProfiles } = barberIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", barberIds)
    : { data: [] };
  const nameById = new Map((barberProfiles ?? []).map((b) => [b.id, b.full_name]));

  const entries = await Promise.all(
    (entriesRaw ?? []).map(async (e) => ({
      ...e,
      photoUrl: await resolvePhotoUrl(supabase, { path: e.photo_path, bucket: "portfolio-photos" }),
      barberName: nameById.get(e.barber_id) ?? "Barber",
    })),
  );

  return (
    <div>
      <Topbar roleLabel="Client" />
      <div style={{ padding: "0 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div className="stage-label">
          <div className="n">Client</div>
          <h2>Browse</h2>
        </div>

        <form method="get" style={{ marginBottom: 20 }}>
          {tag && <input type="hidden" name="tag" value={tag} />}
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search by title…"
            style={{ maxWidth: 320 }}
          />
        </form>

        <div className="chip-row" style={{ marginBottom: 30 }}>
          <Link href={`/client/browse${q ? `?q=${encodeURIComponent(q)}` : ""}`} className={`chip ${!tag ? "on" : ""}`}>
            All
          </Link>
          {CONTROLLED_TAGS.map((t) => {
            const params = new URLSearchParams();
            if (q) params.set("q", q);
            params.set("tag", t);
            return (
              <Link key={t} href={`/client/browse?${params.toString()}`} className={`chip ${tag === t ? "on" : ""}`}>
                {t}
              </Link>
            );
          })}
        </div>

        {entries.length === 0 ? (
          <div className="empty-state">
            <h3>No cuts found</h3>
            <p>Try a different search or tag.</p>
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
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
