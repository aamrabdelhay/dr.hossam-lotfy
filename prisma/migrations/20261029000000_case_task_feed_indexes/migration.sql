-- Improve case lookups and lawyer task feed filtering/sorting.
-- The directory suffix is intentionally unique because the migration runner
-- stores the suffix after the timestamp as the migration name.
CREATE INDEX IF NOT EXISTS "tasks_caseId_idx"
  ON "tasks" ("caseId");

CREATE INDEX IF NOT EXISTS "tasks_authorId_status_scheduledDate_idx"
  ON "tasks" ("authorId", "status", "scheduledDate");
