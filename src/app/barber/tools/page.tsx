import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TOOL_MAINTENANCE } from "@/lib/chaircode/constants";
import { Topbar } from "@/components/Topbar";
import ToolList from "./ToolList";

export default async function ToolCarePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "barber") redirect("/client");

  let { data: tools } = await supabase
    .from("tool_maintenance")
    .select("*")
    .eq("barber_id", user.id)
    .order("created_at", { ascending: true });

  if (!tools || tools.length === 0) {
    const { data: seeded } = await supabase
      .from("tool_maintenance")
      .insert(DEFAULT_TOOL_MAINTENANCE.map((t) => ({ ...t, barber_id: user.id })))
      .select("*");
    tools = seeded ?? [];
  }

  return (
    <div>
      <Topbar roleLabel="Barber" />
      <div style={{ padding: "0 24px", maxWidth: 800, margin: "0 auto" }}>
        <div className="stage-label">
          <div className="n">Barber</div>
          <h2>Tool care</h2>
        </div>
        <p style={{ color: "var(--ivory-dim)", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
          A simple maintenance tracker for the tools you use every day.
        </p>
        <ToolList tools={tools} />
      </div>
    </div>
  );
}
