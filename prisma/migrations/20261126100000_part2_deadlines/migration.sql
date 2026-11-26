-- Part 2 items 113/114. Additive only. NO legal periods are seeded: a senior lawyer enters each rule with its legal source.
CREATE TABLE IF NOT EXISTS "office_deadline_rules" (
  "id" TEXT PRIMARY KEY,
  "name" VARCHAR(200) NOT NULL,
  "unit" VARCHAR(8) NOT NULL CHECK ("unit" IN ('DAYS','MONTHS','YEARS')),
  "amount" INTEGER NOT NULL CHECK ("amount" BETWEEN 1 AND 3650),
  "source_ref" VARCHAR(400) NOT NULL CHECK (char_length(trim("source_ref")) >= 5),
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_by" TEXT, "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS "office_case_deadlines" (
  "id" TEXT PRIMARY KEY,
  "case_id" TEXT NOT NULL REFERENCES "case_records"("id") ON DELETE CASCADE,
  "rule_id" TEXT NOT NULL REFERENCES "office_deadline_rules"("id"),
  "start_date" DATE NOT NULL, "due_date" DATE NOT NULL,
  "note" VARCHAR(500), "status" VARCHAR(10) NOT NULL DEFAULT 'OPEN' CHECK ("status" IN ('OPEN','DONE','CANCELLED')),
  "created_by" TEXT, "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS "office_case_deadlines_case_idx" ON "office_case_deadlines" ("case_id","due_date");
