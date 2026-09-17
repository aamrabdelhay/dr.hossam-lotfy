DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='office_finance_members') THEN
    CREATE TABLE "office_finance_members" (
      "id" text PRIMARY KEY,
      "lawyer_id" text NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "office_finance_members_lawyer_uq" ON "office_finance_members"("lawyer_id");

ALTER TABLE "case_records" ADD COLUMN IF NOT EXISTS "workflow_status" text NOT NULL DEFAULT 'UNDER_REVIEW';
CREATE INDEX IF NOT EXISTS "case_records_workflow_status_idx" ON "case_records"("workflow_status");

INSERT INTO "office_case_categories" ("id","name_ar","name_en","sort_order","active") VALUES
('casecat_contracts','العقود','Contracts',10,true),
('casecat_arbitration','التحكيم','Arbitration',20,true),
('casecat_litigation','التقاضي','Litigation',30,true),
('casecat_compensation','تعويض','Compensation',40,true),
('casecat_incorporation','التأسيس','Incorporation',50,true),
('casecat_companies','الشركات','Companies',60,true)
ON CONFLICT ("id") DO UPDATE SET "name_ar"=EXCLUDED."name_ar","name_en"=EXCLUDED."name_en","sort_order"=EXCLUDED."sort_order","active"=true,"updated_at"=NOW();
UPDATE "office_case_categories" SET "active"=false,"updated_at"=NOW() WHERE "id" IN ('casecat_active','casecat_review','casecat_minutes');
UPDATE "case_records" SET "category_id"='casecat_litigation',"workflow_status"='IN_PROGRESS' WHERE "category_id"='casecat_active';
UPDATE "case_records" SET "category_id"='casecat_litigation',"workflow_status"='UNDER_REVIEW' WHERE "category_id" IN ('casecat_review','casecat_minutes');
