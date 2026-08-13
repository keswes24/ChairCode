"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SignUpState = { error: string | null; sent: boolean };

export async function signUp(
  _prevState: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "");
  const role = String(formData.get("role") ?? "client");

  if (role !== "client" && role !== "barber") {
    return { error: "Invalid role.", sent: false };
  }

  const originHeader = (await headers()).get("origin");
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role, full_name: fullName },
      emailRedirectTo: `${originHeader}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message, sent: false };
  }

  if (data.session) {
    // Email confirmation is disabled on this project — session was created immediately.
    redirect("/");
  }

  return { error: null, sent: true };
}
