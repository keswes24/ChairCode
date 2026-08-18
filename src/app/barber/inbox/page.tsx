import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolvePhotoUrl } from "@/lib/chaircode/photoUrl";
import { Topbar } from "@/components/Topbar";
import LookUpByCode from "./LookUpByCode";

export default async function BarberInboxPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "barber") redirect("/client");

  const { data: cutsRaw } = await supabase
    .from("cuts")
    .select("id, client_id, style_name, photos, client_marked_booked, created_at")
    .eq("booked_barber_id", user.id)
    .order("created_at", { ascending: false });

  const cuts = await Promise.all(
    (cutsRaw ?? []).map(async (c) => {
      const photos = c.photos as { path: string; bucket?: "cut-photos" | "portfolio-photos" }[];
      const thumbUrl = await resolvePhotoUrl(supabase, photos?.[0]);

      let clientName = "Anonymous client";
      if (c.client_marked_booked) {
        const { data: clientProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", c.client_id)
          .maybeSingle();
        if (clientProfile?.full_name) clientName = clientProfile.full_name;
      }

      return { ...c, thumbUrl, clientName };
    }),
  );

  return (
    <div>
      <Topbar roleLabel="Barber" />
      <div style={{ padding: "0 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div className="stage-label">
          <div className="n">Barber</div>
          <h2>Client cut profiles</h2>
        </div>
        <p style={{ color: "var(--ivory-dim)", fontSize: 14, marginBottom: 24, maxWidth: 560, lineHeight: 1.6 }}>
          These are cut profiles clients have sent you ahead of their appointment. Names stay private
          until the client confirms they&rsquo;ve booked.
        </p>

        <LookUpByCode />

        {cuts.length === 0 ? (
          <div className="empty-state">
            <h3>No client profiles yet</h3>
            <p>Once a client sends you a cut, it&rsquo;ll show up here.</p>
          </div>
        ) : (
          <div className="cut-thumb-grid">
            {cuts.map((c) => (
              <Link key={c.id} href={`/barber/inbox/${c.id}`} className="cut-thumb">
                {c.thumbUrl && <img src={c.thumbUrl} alt={c.style_name} />}
                <div className="cap">
                  {c.style_name}
                  <br />
                  {c.clientName}
                  {c.client_marked_booked ? " · Booked" : ""}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
