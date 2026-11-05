CREATE TABLE IF NOT EXISTS "timesheet_entries" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "lawyer_id" TEXT,
  "case_id" TEXT,
  "branch_id" TEXT,
  "work_date" DATE NOT NULL,
  "minutes" INTEGER NOT NULL,
  "description" VARCHAR(500) NOT NULL,
  "billable" BOOLEAN NOT NULL DEFAULT FALSE,
  "status" VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
  "submitted_at" TIMESTAMPTZ,
  "reviewed_by_user_id" TEXT,
  "reviewed_by_lawyer_id" TEXT,
  "reviewed_at" TIMESTAMPTZ,
  "review_note" VARCHAR(1000),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "timesheet_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "timesheet_entries_owner_check" CHECK (num_nonnulls("user_id","lawyer_id") = 1),
  CONSTRAINT "timesheet_entries_minutes_check" CHECK ("minutes" BETWEEN 1 AND 1440),
  CONSTRAINT "timesheet_entries_status_check" CHECK ("status" IN ('DRAFT','SUBMITTED','APPROVED','REJECTED')),
  CONSTRAINT "timesheet_entries_reviewer_check" CHECK (num_nonnulls("reviewed_by_user_id","reviewed_by_lawyer_id") <= 1),
  CONSTRAINT "timesheet_entries_user_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
  CONSTRAINT "timesheet_entries_lawyer_fk" FOREIGN KEY ("lawyer_id") REFERENCES "lawyers"("id") ON DELETE RESTRICT,
  CONSTRAINT "timesheet_entries_case_fk" FOREIGN KEY ("case_id") REFERENCES "case_records"("id") ON DELETE SET NULL,
  CONSTRAINT "timesheet_entries_branch_fk" FOREIGN KEY ("branch_id") REFERENCES "office_branches"("id") ON DELETE SET NULL,
  CONSTRAINT "timesheet_entries_reviewer_user_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "timesheet_entries_reviewer_lawyer_fk" FOREIGN KEY ("reviewed_by_lawyer_id") REFERENCES "lawyers"("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "timesheet_entries_user_date_idx" ON "timesheet_entries" ("user_id","work_date" DESC);
CREATE INDEX IF NOT EXISTS "timesheet_entries_lawyer_date_idx" ON "timesheet_entries" ("lawyer_id","work_date" DESC);
CREATE INDEX IF NOT EXISTS "timesheet_entries_case_date_idx" ON "timesheet_entries" ("case_id","work_date" DESC);
CREATE INDEX IF NOT EXISTS "timesheet_entries_branch_status_date_idx" ON "timesheet_entries" ("branch_id","status","work_date" DESC);
