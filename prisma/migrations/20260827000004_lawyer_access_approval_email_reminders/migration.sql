-- ─────────────────────────────────────────────────────────────────────────────
-- Lawyer access (Gmail / Google OAuth), approval workflow & email reminders.
--
-- 1. googleEmail / googleSub link a lawyer profile to a Google identity for
--    "دخول محامي" (sign in with Gmail). They are private — never rendered on
--    public pages.
-- 2. approvedAt gates the lawyer: NULL ⇒ self-registered and waiting for the
--    office to approve. Existing lawyers are backfilled as already-approved.
-- 3. email_reminders is the ledger used by the daily reminder cron to avoid
--    sending the same reminder twice.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "lawyers" ADD COLUMN IF NOT EXISTS "googleEmail" TEXT;
ALTER TABLE "lawyers" ADD COLUMN IF NOT EXISTS "googleSub" TEXT;
ALTER TABLE "lawyers" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "lawyers_googleEmail_key" ON "lawyers"("googleEmail");
CREATE UNIQUE INDEX IF NOT EXISTS "lawyers_googleSub_key" ON "lawyers"("googleSub");

-- Backfill: every lawyer that already existed before this workflow is approved.
UPDATE "lawyers" SET "approvedAt" = now() WHERE "active" = true AND "approvedAt" IS NULL;

CREATE TABLE IF NOT EXISTS "email_reminders" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "lawyerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'session',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

    CONSTRAINT "email_reminders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "email_reminders_taskId_lawyerId_kind_key" ON "email_reminders"("taskId", "lawyerId", "kind");
CREATE INDEX IF NOT EXISTS "email_reminders_taskId_idx" ON "email_reminders"("taskId");
