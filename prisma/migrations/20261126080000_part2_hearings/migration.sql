-- Part 2 group B (items 99, 101, 105, 107, 108, 109). Additive only.
-- The structured outcome lives in the EXISTING task_feedback row (one outcome store, same approval flow as the free-text result).
ALTER TABLE "task_feedback" ADD COLUMN IF NOT EXISTS "outcome_code" VARCHAR(30);
CREATE TABLE IF NOT EXISTS "office_session_substitutes" (
  "id" TEXT PRIMARY KEY,
  "task_id" TEXT NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "from_lawyer_id" TEXT NOT NULL, "to_lawyer_id" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" VARCHAR(10) NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING','ACCEPTED','DECLINED')),
  "requested_by" TEXT, "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "decided_at" TIMESTAMPTZ);
CREATE INDEX IF NOT EXISTS "office_session_substitutes_task_idx" ON "office_session_substitutes" ("task_id","status");
