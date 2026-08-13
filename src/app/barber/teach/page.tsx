import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TeachFlow from "./TeachFlow";

export default async function TeachPage() {
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
  if (profile?.role !== "barber") redirect("/client");

  return <TeachFlow />;
}
