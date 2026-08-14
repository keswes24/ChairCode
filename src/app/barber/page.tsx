import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/Topbar";

export default async function BarberHome() {
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

  if (profile?.role !== "barber") redirect("/client");

  return (
    <div>
      <Topbar roleLabel="Barber" />
      <div style={{ padding: "0 24px" }}>
        <h1 className="display" style={{ fontSize: 44 }}>
          Welcome, {profile.full_name || user.email}
        </h1>
        <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
          <Link href="/barber/portfolio" className="btn btn-gold">
            My Portfolio
          </Link>
          <Link href="/barber/inbox" className="btn">
            Inbox
          </Link>
          <Link href="/barber/teach" className="btn">
            Teach the AI
          </Link>
          <Link href="/barber/tools" className="btn">
            Tool Care
          </Link>
        </div>
      </div>
    </div>
  );
}
