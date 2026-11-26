-- Part 3 item 187: staff check-in and check-out. Manual tap only, no location. No lateness rule is stored because no office policy was supplied. Additive; rows are never deleted.
CREATE TABLE IF NOT EXISTS "office_staff_attendance" (
  "id" TEXT PRIMARY KEY, "lawyer_id" TEXT NOT NULL REFERENCES "lawyers"("id") ON DELETE CASCADE,
  "day" DATE NOT NULL DEFAULT CURRENT_DATE, "in_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "out_at" TIMESTAMPTZ);
CREATE INDEX IF NOT EXISTS "office_staff_attendance_idx" ON "office_staff_attendance" ("lawyer_id","day");
