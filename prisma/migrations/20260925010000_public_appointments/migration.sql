CREATE TABLE IF NOT EXISTS "client_appointments" (
  "id" TEXT PRIMARY KEY,
  "client_id" TEXT NOT NULL,
  "source_submission_id" TEXT NOT NULL UNIQUE,
  "appointment_date" DATE NOT NULL,
  "appointment_time" TEXT NOT NULL,
  "appointment_type" TEXT NOT NULL,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "client_appointments_client_idx" ON "client_appointments" ("client_id", "appointment_date", "appointment_time");
CREATE INDEX IF NOT EXISTS "client_appointments_date_idx" ON "client_appointments" ("appointment_date", "status");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_appointments_client_fkey') THEN
    ALTER TABLE "client_appointments" ADD CONSTRAINT "client_appointments_client_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;
  END IF;
END $$;
