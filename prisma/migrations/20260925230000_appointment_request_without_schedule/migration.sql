ALTER TABLE "client_appointments"
  ALTER COLUMN "appointment_date" DROP NOT NULL,
  ALTER COLUMN "appointment_time" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "client_appointments_pending_idx"
  ON "client_appointments" ("status", "appointment_type", "created_at");
