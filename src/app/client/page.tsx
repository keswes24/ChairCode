import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/Topbar";

export default async function ClientHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "client") redirect("/barber");

  return (
    <div>
      <Topbar roleLabel="Client" />
      <div style={{ padding: "0 24px" }}>
        <h1 className="display" style={{ fontSize: 44 }}>
          Welcome, {profile.full_name || user.email}
        </h1>
        <p style={{ color: "var(--ivory-dim)", marginTop: 12 }}>
          Client auth is wired up. New Cut flow lands next.
        </p>
      </div>
    </div>
  );
}
