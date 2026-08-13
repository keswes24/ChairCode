import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FOLDER_NAMES } from "@/lib/chaircode/questions";
import { Topbar } from "@/components/Topbar";

export default async function FoldersPage() {
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

  const { data: cuts } = await supabase
    .from("cuts")
    .select("folder")
    .eq("client_id", user.id);

  const counts = new Map<string, number>();
  (cuts ?? []).forEach((c) => counts.set(c.folder, (counts.get(c.folder) ?? 0) + 1));
  const hasCuts = (cuts ?? []).length > 0;

  return (
    <div>
      <Topbar roleLabel="Client" />
      <div style={{ padding: "0 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div className="stage-label">
          <div className="n">Client</div>
          <h2>Your folders</h2>
        </div>

        {hasCuts ? (
          <div className="folders-grid">
            {FOLDER_NAMES.map((f) => (
              <Link key={f} href={`/client/folders/${encodeURIComponent(f)}`} className="folder-card">
                <div className="count">{String(counts.get(f) ?? 0).padStart(2, "0")}</div>
                <div className="fname">{f}</div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No saved cuts yet</h3>
            <p style={{ marginBottom: 20 }}>Upload a reference photo to build your first translation.</p>
            <Link href="/client/new-cut" className="btn btn-gold">
              Start a new cut
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
