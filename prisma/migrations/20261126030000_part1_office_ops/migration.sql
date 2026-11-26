-- Part 1 group C1 (items 56, 57, 91, 94, 98). Additive only.
-- Needed by no-show history (branch checks). Same column the public-booking migration adds; IF NOT EXISTS keeps both orders safe.
ALTER TABLE "client_appointments" ADD COLUMN IF NOT EXISTS "branch_id" TEXT;
CREATE TABLE IF NOT EXISTS "office_task_templates" (
  "id" TEXT PRIMARY KEY, "name" VARCHAR(120) NOT NULL UNIQUE, "description" VARCHAR(500) NOT NULL, "notes" VARCHAR(2000),
  "checklist" JSONB NOT NULL DEFAULT '[]'::jsonb, "created_by" TEXT, "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS "office_task_checklist_items" (
  "id" TEXT PRIMARY KEY, "task_id" TEXT NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE, "position" INTEGER NOT NULL,
  "text" VARCHAR(300) NOT NULL, "done_at" TIMESTAMPTZ, "done_by" TEXT);
CREATE INDEX IF NOT EXISTS "office_task_checklist_task_idx" ON "office_task_checklist_items" ("task_id","position");
CREATE TABLE IF NOT EXISTS "office_number_counters" (
  "scope" VARCHAR(20) NOT NULL, "year" INTEGER NOT NULL, "last_value" INTEGER NOT NULL DEFAULT 0, CONSTRAINT "office_number_counters_pkey" PRIMARY KEY ("scope","year"));
CREATE TABLE IF NOT EXISTS "office_courts" (
  "id" TEXT PRIMARY KEY, "name" VARCHAR(200) NOT NULL, "city" VARCHAR(100), "governorate" VARCHAR(100),
  "active" BOOLEAN NOT NULL DEFAULT TRUE, "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(), CONSTRAINT "office_courts_uq" UNIQUE ("name","city"));
CREATE TABLE IF NOT EXISTS "office_waitlist" (
  "id" TEXT PRIMARY KEY, "client_id" TEXT NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE, "branch_id" TEXT NOT NULL,
  "from_date" DATE NOT NULL, "to_date" DATE NOT NULL, "notes" VARCHAR(500),
  "status" VARCHAR(10) NOT NULL DEFAULT 'WAITING' CHECK ("status" IN ('WAITING','OFFERED','BOOKED','CANCELLED')),
  "created_by" TEXT, "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(), CONSTRAINT "office_waitlist_dates_ck" CHECK ("to_date" >= "from_date"));
CREATE INDEX IF NOT EXISTS "office_waitlist_branch_idx" ON "office_waitlist" ("branch_id","status","from_date");
CREATE TABLE IF NOT EXISTS "office_no_shows" (
  "id" TEXT PRIMARY KEY, "appointment_id" TEXT NOT NULL UNIQUE REFERENCES "client_appointments"("id") ON DELETE CASCADE,
  "client_id" TEXT NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE, "note" VARCHAR(300), "marked_by" TEXT, "marked_at" TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS "office_no_shows_client_idx" ON "office_no_shows" ("client_id");
