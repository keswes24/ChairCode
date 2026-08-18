import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FOLDER_NAMES } from "@/lib/chaircode/questions";
import { Topbar } from "@/components/Topbar";
import AddChildProfile from "@/components/AddChildProfile";

export default async function FoldersPage({
  searchParams,
}: {
  searchParams: Promise<{ profile?: string }>;
}) {
  const { profile: profileParam } = await searchParams;

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

  const { data: childProfiles } = await supabase
    .from("child_profiles")
    .select("id, name, age_range")
    .eq("parent_id", user.id)
    .order("created_at", { ascending: true });

  let cutsQuery = supabase.from("cuts").select("folder").eq("client_id", user.id);
  cutsQuery = profileParam
    ? cutsQuery.eq("for_child_id", profileParam)
    : cutsQuery.is("for_child_id", null);
  const { data: cuts } = await cutsQuery;

  const counts = new Map<string, number>();
  (cuts ?? []).forEach((c) => counts.set(c.folder, (counts.get(c.folder) ?? 0) + 1));
  const hasCuts = (cuts ?? []).length > 0;

  const twoWeeksOut = new Date();
  twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);
  let dueSoonQuery = supabase
    .from("cuts")
    .select("id, style_name, folder, next_maintenance_due")
    .eq("client_id", user.id)
    .not("next_maintenance_due", "is", null)
    .lte("next_maintenance_due", twoWeeksOut.toISOString().slice(0, 10))
    .order("next_maintenance_due", { ascending: true });
  dueSoonQuery = profileParam
    ? dueSoonQuery.eq("for_child_id", profileParam)
    : dueSoonQuery.is("for_child_id", null);
  const { data: dueSoon } = await dueSoonQuery;

  return (
    <div>
      <Topbar roleLabel="Client" />
      <div style={{ padding: "0 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div className="stage-label">
          <div className="n">Client</div>
          <h2>Your folders</h2>
        </div>

        <div className="eyebrow" style={{ marginBottom: 10 }}>
          Whose cuts
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 30, alignItems: "center" }}>
          <Link href="/client/folders" className={`folder-chip ${!profileParam ? "selected" : ""}`}>
            Myself
          </Link>
          {(childProfiles ?? []).map((c) => (
            <Link
              key={c.id}
              href={`/client/folders?profile=${c.id}`}
              className={`folder-chip ${profileParam === c.id ? "selected" : ""}`}
            >
              {c.name || "Unnamed"}
              {c.age_range ? ` · ${c.age_range}` : ""}
            </Link>
          ))}
          <AddChildProfile />
        </div>

        {dueSoon && dueSoon.length > 0 && (
          <div style={{ marginBottom: 30 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>
              Maintenance due soon
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {dueSoon.map((c) => {
                const overdue = new Date(c.next_maintenance_due) < new Date();
                return (
                  <Link
                    key={c.id}
                    href={`/client/cuts/${c.id}`}
                    className="filter-flag"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <span>{c.style_name}</span>
                    <span style={{ color: overdue ? "var(--danger)" : "var(--gold-bright)" }}>
                      {overdue ? "Overdue" : "Due"}{" "}
                      {new Date(c.next_maintenance_due).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {hasCuts ? (
          <div className="folders-grid">
            {FOLDER_NAMES.map((f) => (
              <Link
                key={f}
                href={`/client/folders/${encodeURIComponent(f)}${profileParam ? `?profile=${profileParam}` : ""}`}
                className="folder-card"
              >
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
