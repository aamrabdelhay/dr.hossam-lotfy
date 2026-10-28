-- Improve case lookups and lawyer task feed filtering/sorting.
CREATE INDEX IF NOT EXISTS "tasks_caseId_idx"
  ON "tasks" ("caseId");

CREATE INDEX IF NOT EXISTS "tasks_authorId_status_scheduledDate_idx"
  ON "tasks" ("authorId", "status", "scheduledDate");
