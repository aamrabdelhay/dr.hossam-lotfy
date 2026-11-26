-- Part 4 items 205, 208, 210: workflow rules from a FIXED catalog (no free-form code). A rule turns a condition found in existing data into an in-app notification (the existing push cron delivers it). Nothing is enabled until senior management enables it. A run records (rule, subject, day) so one subject is notified at most once per day.
CREATE TABLE IF NOT EXISTS "office_workflow_rules" (
  "id" TEXT PRIMARY KEY,
  "event_kind" VARCHAR(30) NOT NULL UNIQUE CHECK ("event_kind" IN ('INSTALLMENT_OVERDUE','BUDGET_NEAR','BUDGET_EXCEEDED','TASK_OVERDUE','REVIEW_PENDING')),
  "enabled" BOOLEAN NOT NULL DEFAULT FALSE, "threshold_days" INTEGER NOT NULL DEFAULT 0 CHECK ("threshold_days" BETWEEN 0 AND 365),
  "notify_group" VARCHAR(10) NOT NULL DEFAULT 'SENIOR' CHECK ("notify_group" IN ('SENIOR','FINANCE')),
  "updated_by" TEXT, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS "office_workflow_runs" (
  "rule_id" TEXT NOT NULL, "subject_id" TEXT NOT NULL, "fired_on" DATE NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("rule_id","subject_id","fired_on"));
