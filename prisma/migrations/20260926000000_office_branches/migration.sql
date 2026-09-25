-- Branch-aware office structure.
CREATE TABLE IF NOT EXISTS "office_branches" (
  "id" text PRIMARY KEY,
  "code" text NOT NULL UNIQUE,
  "name_ar" text NOT NULL,
  "name_en" text,
  "address" text NOT NULL,
  "is_main" boolean NOT NULL DEFAULT false,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "office_branches_main_uq" ON "office_branches"("is_main") WHERE "is_main"=true;

CREATE TABLE IF NOT EXISTS "office_branch_lawyers" (
  "branch_id" text NOT NULL,
  "lawyer_id" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("branch_id","lawyer_id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "office_branch_lawyers_lawyer_uq" ON "office_branch_lawyers"("lawyer_id");

CREATE TABLE IF NOT EXISTS "office_branch_managers" (
  "id" text PRIMARY KEY,
  "branch_id" text NOT NULL,
  "manager_type" text NOT NULL CHECK ("manager_type" IN ('OFFICE_MANAGER','FINANCE_MANAGER')),
  "user_id" text,
  "lawyer_id" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "office_branch_managers_identity" CHECK (("user_id" IS NOT NULL) OR ("lawyer_id" IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS "office_branch_managers_branch_type_uq" ON "office_branch_managers"("branch_id","manager_type");
CREATE UNIQUE INDEX IF NOT EXISTS "office_branch_managers_lawyer_type_uq" ON "office_branch_managers"("lawyer_id","manager_type") WHERE "lawyer_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "office_branch_managers_user_type_uq" ON "office_branch_managers"("user_id","manager_type") WHERE "user_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "office_branch_managers_branch_idx" ON "office_branch_managers"("branch_id");

ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "branch_id" text;
ALTER TABLE "case_records" ADD COLUMN IF NOT EXISTS "branch_id" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "branch_id" text;
ALTER TABLE "office_requests" ADD COLUMN IF NOT EXISTS "branch_id" text;
ALTER TABLE "financial_dues" ADD COLUMN IF NOT EXISTS "branch_id" text;
ALTER TABLE "office_expenses" ADD COLUMN IF NOT EXISTS "branch_id" text;

CREATE INDEX IF NOT EXISTS "clients_branch_idx" ON "clients"("branch_id");
CREATE INDEX IF NOT EXISTS "case_records_branch_idx" ON "case_records"("branch_id");
CREATE INDEX IF NOT EXISTS "tasks_branch_idx" ON "tasks"("branch_id");
CREATE INDEX IF NOT EXISTS "office_requests_branch_idx" ON "office_requests"("branch_id");
CREATE INDEX IF NOT EXISTS "financial_dues_branch_idx" ON "financial_dues"("branch_id");
CREATE INDEX IF NOT EXISTS "office_expenses_branch_idx" ON "office_expenses"("branch_id");

INSERT INTO "office_branches" ("id","code","name_ar","name_en","address","is_main")
VALUES ('branch_main','MAIN','المقر الرئيسي','Main Office','6 شارع السد العالي الدقي – الجيزة',true)
ON CONFLICT ("id") DO UPDATE SET
  "name_ar"=EXCLUDED."name_ar",
  "name_en"=EXCLUDED."name_en",
  "address"=EXCLUDED."address",
  "is_main"=true,
  "active"=true,
  "updated_at"=NOW();

INSERT INTO "office_branch_lawyers" ("branch_id","lawyer_id")
SELECT 'branch_main',"id" FROM "lawyers"
ON CONFLICT ("lawyer_id") DO NOTHING;

UPDATE "clients" SET "branch_id"='branch_main' WHERE "branch_id" IS NULL;
UPDATE "case_records" SET "branch_id"='branch_main' WHERE "branch_id" IS NULL;
UPDATE "tasks" SET "branch_id"='branch_main' WHERE "branch_id" IS NULL;
UPDATE "office_requests" SET "branch_id"='branch_main' WHERE "branch_id" IS NULL;
UPDATE "financial_dues" SET "branch_id"='branch_main' WHERE "branch_id" IS NULL;
UPDATE "office_expenses" SET "branch_id"='branch_main' WHERE "branch_id" IS NULL;

INSERT INTO "office_branch_managers" ("id","branch_id","manager_type","lawyer_id")
SELECT 'branch_finance_legacy_' || md5(f."id"), 'branch_main', 'FINANCE_MANAGER', f."lawyer_id"
FROM "office_finance_members" f
WHERE f."lawyer_id" IS NOT NULL
ON CONFLICT DO NOTHING;
