-- ChairCode: async feedback-reminder job (step 7)
-- Tracks when an after-photo was actually added (so "a week later" is
-- computed from the real event, not row creation) and whether a reminder
-- has already gone out, so the cron job never double-sends.

alter table public.cuts
  add column after_photo_added_at timestamptz,
  add column feedback_reminder_sent_at timestamptz;
