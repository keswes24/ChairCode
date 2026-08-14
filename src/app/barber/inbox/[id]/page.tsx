import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ZONES, type Zone } from "@/lib/chaircode/constants";
import { resolvePhotoUrl } from "@/lib/chaircode/photoUrl";
import { Topbar } from "@/components/Topbar";
import CorrectionPanel from "./CorrectionPanel";

const ZONE_LABELS: Record<Zone, string> = {
  front: "Front",
  crown: "Crown",
  sideburns: "Sideburns",
  sides: "Sides",
  neckline: "Neckline",
  back: "Back",
  general: "General",
};

export default async function BarberInboxDetailPage({
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
    .select("*")
    .eq("id", id)
    .eq("booked_barber_id", user.id)
    .single();

  if (!cut) notFound();

  const photos = cut.photos as { path: string; bucket?: "cut-photos" | "portfolio-photos" }[];
  const photoUrl = await resolvePhotoUrl(supabase, photos?.[0]);

  let afterPhotoUrl: string | null = null;
  if (cut.after_photo_path) {
    afterPhotoUrl = await resolvePhotoUrl(supabase, { path: cut.after_photo_path, bucket: "cut-photos" });
  }

  let clientName = "Anonymous client";
  if (cut.client_marked_booked) {
    const { data: clientProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", cut.client_id)
      .maybeSingle();
    if (clientProfile?.full_name) clientName = clientProfile.full_name;
  }

  const breakdown = cut.breakdown as Record<Zone, string>;
  const corrected = (cut.corrected ?? {}) as Partial<Record<Zone, string>>;
  const flags = (cut.flags ?? {}) as Partial<Record<Zone, boolean>>;

  return (
    <div>
      <Topbar roleLabel="Barber" />
      <div style={{ padding: "0 24px", maxWidth: 1100, margin: "0 auto" }}>
        <Link
          href="/barber/inbox"
          style={{ display: "inline-flex", marginBottom: 20, color: "var(--ivory-dim)", fontSize: 13 }}
        >
          ← All profiles
        </Link>

        <div className="barber-banner">
          <div className="l">
            {clientName}
            {cut.client_marked_booked ? " · Booked" : " · Not yet confirmed booked"}
          </div>
        </div>

        <div className="split">
          <div>
            <div className="photo-card">
              {photoUrl && <img src={photoUrl} alt={cut.style_name} />}
              <div className="meta">
                <div className="name">{cut.style_name}</div>
              </div>
            </div>
            {afterPhotoUrl && (
              <div className="photo-card" style={{ marginTop: 16 }}>
                <img src={afterPhotoUrl} alt="After photo" />
                <div className="meta">
                  <div className="tag">After photo — servicing confirmed</div>
                </div>
              </div>
            )}
          </div>
          <div>
            <div className="stage-label">
              <div className="n">Barber</div>
              <h2>Correct the breakdown</h2>
            </div>
            <CorrectionPanel
              cutId={cut.id}
              zones={ZONES.map((z) => ({
                key: z,
                label: ZONE_LABELS[z],
                original: breakdown[z],
                text: corrected[z] ?? breakdown[z],
                flagged: !!flags[z],
              }))}
              checkoutCode={cut.checkout_code}
              barberConfirmedViaCode={cut.barber_confirmed_via_code}
              hasAfterPhoto={!!cut.after_photo_path}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
