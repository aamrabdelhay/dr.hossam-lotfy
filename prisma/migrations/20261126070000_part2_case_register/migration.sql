-- Part 2 group A (items 115-121, 123). Additive only. Rows are never deleted; use status CANCELLED/VOID.
CREATE TABLE IF NOT EXISTS "office_case_register" (
  "id" TEXT PRIMARY KEY,
  "case_id" TEXT NOT NULL REFERENCES "case_records"("id") ON DELETE CASCADE,
  "kind" VARCHAR(20) NOT NULL CHECK ("kind" IN ('ENFORCEMENT','EXPERT_MISSION','POA','CORRESPONDENCE','CUSTODY','MONEY','CHECKLIST')),
  "title" VARCHAR(300) NOT NULL,
  "status" VARCHAR(12) NOT NULL DEFAULT 'OPEN' CHECK ("status" IN ('OPEN','DONE','CANCELLED')),
  "due_date" DATE,
  "amount" NUMERIC(14,2),
  "data" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_by" TEXT, "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS "office_case_register_case_idx" ON "office_case_register" ("case_id","kind","created_at" DESC);
