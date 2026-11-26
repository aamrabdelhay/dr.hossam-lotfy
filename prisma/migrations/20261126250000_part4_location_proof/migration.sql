-- Part 4 item 227: location proof attached to a staff attendance record ONLY when the lawyer taps and consents for that single use. No background tracking.
CREATE TABLE IF NOT EXISTS "office_attendance_location_proofs" (
  "id" TEXT PRIMARY KEY,
  "attendance_id" TEXT NOT NULL REFERENCES "office_staff_attendance"("id") ON DELETE CASCADE,
  "lawyer_id" TEXT NOT NULL,
  "phase" VARCHAR(3) NOT NULL CHECK ("phase" IN ('IN','OUT')),
  "lat" DOUBLE PRECISION NOT NULL CHECK ("lat" BETWEEN -90 AND 90),
  "lon" DOUBLE PRECISION NOT NULL CHECK ("lon" BETWEEN -180 AND 180),
  "accuracy_m" DOUBLE PRECISION,
  "consented_at" TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE UNIQUE INDEX IF NOT EXISTS "office_attendance_location_proofs_once" ON "office_attendance_location_proofs" ("attendance_id","phase");
