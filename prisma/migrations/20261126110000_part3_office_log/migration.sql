-- Part 3 items 177 (meeting minutes), 178 (decisions), 183 (visitors), 188 (incidents). Additive. Entries are never deleted; a wrong entry is corrected by a new entry or status change.
CREATE TABLE IF NOT EXISTS "office_log" (
  "id" TEXT PRIMARY KEY,
  "kind" VARCHAR(12) NOT NULL CHECK ("kind" IN ('MINUTES','DECISION','VISITOR','INCIDENT')),
  "branch_id" TEXT NOT NULL,
  "title" VARCHAR(300) NOT NULL,
  "body" TEXT,
  "occurred_on" DATE NOT NULL DEFAULT CURRENT_DATE,
  "status" VARCHAR(10) NOT NULL DEFAULT 'OPEN' CHECK ("status" IN ('OPEN','CLOSED')),
  "created_by" TEXT, "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS "office_log_kind_idx" ON "office_log" ("kind","occurred_on" DESC);
