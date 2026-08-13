import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { ZONES, type Zone } from "@/lib/chaircode/constants";
import { resolvePhotoUrl } from "@/lib/chaircode/photoUrl";
import { Topbar } from "@/components/Topbar";

const ZONE_LABELS: Record<Zone, string> = {
  front: "Front",
  crown: "Crown",
  sideburns: "Sideburns",
  sides: "Sides",
  neckline: "Neckline",
  back: "Back",
  general: "General",
};

export default async function SavedCutPage({
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

  const { data: cut } = await supabase
    .from("cuts")
    .select("*")
    .eq("id", id)
    .eq("client_id", user.id)
    .single();

  if (!cut) notFound();

  const photos = cut.photos as { path: string; bucket?: "cut-photos" | "portfolio-photos" }[];
  const photoUrl = await resolvePhotoUrl(supabase, photos?.[0]);

  const qrDataUrl = await QRCode.toDataURL(cut.checkout_code, {
    margin: 1,
    width: 200,
    color: { dark: "#0b0b0c", light: "#e4c578" },
  });

  const breakdown = cut.breakdown as Record<Zone, string>;

  return (
    <div>
      <Topbar roleLabel="Client" />
      <div style={{ padding: "0 24px", maxWidth: 1100, margin: "0 auto" }}>
        <Link
          href={`/client/folders/${encodeURIComponent(cut.folder)}`}
          style={{ display: "inline-flex", marginBottom: 20, color: "var(--ivory-dim)", fontSize: 13 }}
        >
          ← {cut.folder}
        </Link>
        <div className="split">
          <div>
            <div className="photo-card">
              {photoUrl && <img src={photoUrl} alt={cut.style_name} />}
              <div className="meta">
                <div className="name">{cut.style_name}</div>
                <div className="tag">
                  Saved{" "}
                  {new Date(cut.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 20, textAlign: "center" }}>
              <img
                src={qrDataUrl}
                alt="Checkout QR code"
                style={{ width: 160, height: 160, borderRadius: 4 }}
              />
              <div className="mono" style={{ fontSize: 16, color: "var(--gold-bright)", marginTop: 10 }}>
                {cut.checkout_code}
              </div>
            </div>
          </div>
          <div>
            <div className="stage-label">
              <div className="n">Saved</div>
              <h2>Breakdown</h2>
            </div>
            {ZONES.map((z) => (
              <div className="zone-card" key={z}>
                <div>
                  <div className="zlabel">{ZONE_LABELS[z]}</div>
                </div>
                <div className="ztext">{breakdown[z]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
