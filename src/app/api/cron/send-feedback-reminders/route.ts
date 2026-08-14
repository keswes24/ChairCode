import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

const resend = new Resend(process.env.RESEND_API_KEY);
const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";
const REMINDER_DELAY_DAYS = 7;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createAdminClient();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - REMINDER_DELAY_DAYS);

  const { data: dueCuts, error: fetchError } = await supabase
    .from("cuts")
    .select("id, client_id, style_name, after_photo_added_at")
    .not("after_photo_added_at", "is", null)
    .lte("after_photo_added_at", cutoff.toISOString())
    .is("feedback", null)
    .is("feedback_reminder_sent_at", null);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  let sent = 0;
  const errors: string[] = [];

  for (const cut of dueCuts ?? []) {
    const { data: client } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", cut.client_id)
      .single();

    if (!client?.email) {
      errors.push(`Cut ${cut.id}: no client email on file.`);
      continue;
    }

    const link = `${SITE_URL}/client/cuts/${cut.id}`;
    try {
      await resend.emails.send({
        from: "ChairCode <onboarding@resend.dev>",
        to: client.email,
        subject: "How'd your cut turn out?",
        html: `
          <p>Hi ${client.full_name || "there"},</p>
          <p>It's been about a week since your <strong>${cut.style_name}</strong> appointment. We'd love to hear how it turned out — takes 30 seconds.</p>
          <p><a href="${link}">Leave feedback →</a></p>
          <p style="color:#888;font-size:12px;">You're getting this because you have an appointment logged on ChairCode.</p>
        `,
      });
      await supabase
        .from("cuts")
        .update({ feedback_reminder_sent_at: new Date().toISOString() })
        .eq("id", cut.id);
      sent += 1;
    } catch (err) {
      errors.push(`Cut ${cut.id}: ${(err as Error).message}`);
    }
  }

  return NextResponse.json({ checked: dueCuts?.length ?? 0, sent, errors });
}
