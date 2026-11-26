-- Part 1 item 90. Additive side table; the notifications table is untouched.
CREATE TABLE IF NOT EXISTS "office_notification_meta" (
  "notification_id" TEXT PRIMARY KEY REFERENCES "notifications"("id") ON DELETE CASCADE,
  "priority" VARCHAR(8) NOT NULL DEFAULT 'NORMAL' CHECK ("priority" IN ('LOW','NORMAL','HIGH')),
  "snoozed_until" TIMESTAMPTZ);
CREATE INDEX IF NOT EXISTS "office_notification_meta_snooze_idx" ON "office_notification_meta" ("snoozed_until");
