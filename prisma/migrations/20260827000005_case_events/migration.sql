-- ─────────────────────────────────────────────────────────────────────────────
-- Case archive: client name + persistent case history (case_events).
--
-- 1. clientName — the client associated with a case (العميل), shown alongside
--    the case name/number in the admin case archive.
-- 2. case_events — an append-only timeline of milestones for a case
--    (e.g. "تم فتح الملف", "تم تحديد الجلسة"). Admins review the full history;
--    lawyers see the history of cases they are involved in.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "case_records" ADD COLUMN IF NOT EXISTS "clientName" TEXT;

CREATE TABLE IF NOT EXISTS "case_events" (
    "id"          TEXT NOT NULL,
    "caseId"      TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type"        TEXT NOT NULL DEFAULT 'note',
    "authorName"  TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT now(),

    CONSTRAINT "case_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "case_events_caseId_createdAt_idx" ON "case_events"("caseId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'case_events_caseId_fkey'
  ) THEN
    ALTER TABLE "case_events"
      ADD CONSTRAINT "case_events_caseId_fkey"
      FOREIGN KEY ("caseId") REFERENCES "case_records"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
