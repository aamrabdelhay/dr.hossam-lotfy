-- Part 2 group C (items 102, 104, 109 csv). Additive only. Attendance rows are append-only (no update, no delete).
-- No GPS or device location is captured; the time is the server time of the tap.
CREATE TABLE IF NOT EXISTS "office_session_attendance" (
  "id" TEXT PRIMARY KEY,
  "task_id" TEXT NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "lawyer_id" TEXT NOT NULL,
  "kind" VARCHAR(8) NOT NULL CHECK ("kind" IN ('ARRIVE','DEPART')),
  "note" VARCHAR(300),
  "at" TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS "office_session_attendance_task_idx" ON "office_session_attendance" ("task_id","at");
-- Manual transit minutes between two locations, entered by management. Not a map estimate.
CREATE TABLE IF NOT EXISTS "office_transit_minutes" (
  "from_location_id" TEXT NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
  "to_location_id" TEXT NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
  "minutes" INTEGER NOT NULL CHECK ("minutes" BETWEEN 0 AND 600),
  "set_by" TEXT, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("from_location_id","to_location_id"));
