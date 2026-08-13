import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolvePhotoUrl } from "@/lib/chaircode/photoUrl";
import { Topbar } from "@/components/Topbar";

export default async function FolderDetailPage({
  params,
}: {
  params: Promise<{ folder: string }>;
}) {
  const { folder } = await params;
  const decodedFolder = decodeURIComponent(folder);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cutsRaw } = await supabase
    .from("cuts")
    .select("id, style_name, created_at, photos")
    .eq("client_id", user.id)
    .eq("folder", decodedFolder)
    .order("created_at", { ascending: false });

  const cuts = await Promise.all(
    (cutsRaw ?? []).map(async (c) => {
      const photos = c.photos as { path: string; bucket?: "cut-photos" | "portfolio-photos" }[];
      const thumbUrl = await resolvePhotoUrl(supabase, photos?.[0]);
      return { ...c, thumbUrl };
    }),
  );

  return (
    <div>
      <Topbar roleLabel="Client" />
      <div style={{ padding: "0 24px", maxWidth: 1100, margin: "0 auto" }}>
        <Link href="/client/folders" className="back-link" style={{ display: "inline-flex", marginBottom: 20, color: "var(--ivory-dim)", fontSize: 13 }}>
          ← All folders
        </Link>
        <div className="stage-label">
          <div className="n">Folder</div>
          <h2>{decodedFolder}</h2>
        </div>

        {!cuts || cuts.length === 0 ? (
          <div className="empty-state">
            <h3>Nothing saved here yet</h3>
          </div>
        ) : (
          <div className="cut-thumb-grid">
            {cuts.map((c) => (
              <Link key={c.id} href={`/client/cuts/${c.id}`} className="cut-thumb">
                {c.thumbUrl && <img src={c.thumbUrl} alt={c.style_name} />}
                <div className="cap">
                  {c.style_name}
                  <br />
                  {new Date(c.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
