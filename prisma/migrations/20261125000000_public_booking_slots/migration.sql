ALTER TABLE "client_appointments" ADD COLUMN IF NOT EXISTS "branch_id" TEXT;
ALTER TABLE "client_appointments" ADD COLUMN IF NOT EXISTS "mode" TEXT;
ALTER TABLE "client_appointments" ADD COLUMN IF NOT EXISTS "reminder_sent_at" TIMESTAMP(3);
-- One live appointment per branch/day/time. Cancelled ones free the slot.
CREATE UNIQUE INDEX IF NOT EXISTS "client_appointments_slot_live_key"
  ON "client_appointments" ("branch_id", "appointment_date", "appointment_time")
  WHERE "status" <> 'CANCELLED' AND "branch_id" IS NOT NULL AND "appointment_date" IS NOT NULL AND "appointment_time" IS NOT NULL;
