import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NewCutFlow from "./NewCutFlow";

export default async function NewCutPage() {
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

  return <NewCutFlow />;
}
