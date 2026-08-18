import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ZONES, type Zone } from "@/lib/chaircode/constants";
import { resolvePhotoUrl } from "@/lib/chaircode/photoUrl";
import ClaimButton from "./ClaimButton";

const ZONE_LABELS: Record<Zone, string> = {
  front: "Front",
  crown: "Crown",
  sideburns: "Sideburns",
  sides: "Sides",
  neckline: "Neckline",
  back: "Back",
  general: "General",
};

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const normalizedCode = decodeURIComponent(code).trim().toUpperCase();

  // Public, unauthenticated lookup by checkout code — this is intentionally
  // a "anyone with the exact code can view it" link, same model as sharing a
  // Google Doc link. Uses the admin client because there is no user session
  // to scope regular RLS to; only the single matching row is ever returned.
  const admin = createAdminClient();
  const { data: cut } = await admin
    .from("cuts")
    .select("id, style_name, breakdown, photos, checkout_code, filtered")
    .eq("checkout_code", normalizedCode)
    .maybeSingle();

  if (!cut) notFound();

  const photos = cut.photos as { path: string; bucket?: "cut-photos" | "portfolio-photos" }[];
  const photoUrl = await resolvePhotoUrl(admin, photos?.[0]);
  const breakdown = cut.breakdown as Record<Zone, string>;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let viewerRole: "client" | "barber" | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    viewerRole = (profile?.role as "client" | "barber" | undefined) ?? null;
  }

  return (
    <div style={{ padding: "0 24px", maxWidth: 1100, margin: "40px auto" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 36 }}>
        <div className="display" style={{ fontSize: 28 }}>
          Chair<span style={{ color: "var(--gold)" }}>Code</span>
        </div>
        <div className="mono" style={{ fontSize: 10, color: "var(--ivory-dim)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
          Checkout
        </div>
      </div>

      <div className="split">
        <div>
          <div className="photo-card">
            {photoUrl && <img src={photoUrl} alt={cut.style_name} />}
            <div className="meta">
              <div className="name">{cut.style_name}</div>
              <div className="tag mono">{cut.checkout_code}</div>
            </div>
          </div>
          {cut.filtered && (
            <div className="filter-flag">
              ⚠ This reference looks styled or professionally lit — the real-life result may vary.
            </div>
          )}
        </div>
        <div>
          <div className="stage-label">
            <div className="n">Checkout</div>
            <h2>Full breakdown</h2>
          </div>
          {ZONES.map((z) => (
            <div className="zone-card" key={z}>
              <div>
                <div className="zlabel">{ZONE_LABELS[z]}</div>
              </div>
              <div className="ztext">{breakdown[z]}</div>
            </div>
          ))}

          <div style={{ marginTop: 30 }}>
            {viewerRole === "barber" ? (
              <ClaimButton checkoutCode={cut.checkout_code} />
            ) : (
              <div
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius)",
                  padding: 18,
                }}
              >
                <p style={{ fontSize: 13.5, color: "var(--ivory-dim)", marginBottom: 14, lineHeight: 1.6 }}>
                  Are you the barber doing this cut? Create a free ChairCode account to save this
                  client to your inbox, build your portfolio, and get found by more clients.
                </p>
                <Link href="/signup?role=barber" className="btn btn-gold">
                  Sign up as a barber →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
