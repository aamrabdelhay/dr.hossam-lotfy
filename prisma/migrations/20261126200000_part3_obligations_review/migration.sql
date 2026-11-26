-- Part 3 item 159 (contract obligations) uses the existing case register as kind OBLIGATION. Item 158 (legal review and approval of documents) adds review columns to case_files. Additive.
ALTER TABLE "office_case_register" DROP CONSTRAINT IF EXISTS "office_case_register_kind_check";
ALTER TABLE "office_case_register" ADD CONSTRAINT "office_case_register_kind_check" CHECK ("kind" IN ('ENFORCEMENT','EXPERT_MISSION','POA','CORRESPONDENCE','CUSTODY','MONEY','CHECKLIST','NOTE','OBLIGATION'));
ALTER TABLE "case_files" ADD COLUMN IF NOT EXISTS "review_status" VARCHAR(12) NOT NULL DEFAULT 'DRAFT' CHECK ("review_status" IN ('DRAFT','IN_REVIEW','APPROVED','REJECTED'));
ALTER TABLE "case_files" ADD COLUMN IF NOT EXISTS "reviewed_by" TEXT;
ALTER TABLE "case_files" ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMPTZ;
