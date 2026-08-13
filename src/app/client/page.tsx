import Link from "next/link";
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
        <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
          <Link href="/client/new-cut" className="btn btn-gold">
            New Cut
          </Link>
          <Link href="/client/folders" className="btn">
            Folders
          </Link>
        </div>
      </div>
    </div>
  );
}
