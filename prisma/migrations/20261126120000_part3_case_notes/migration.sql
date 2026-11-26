-- Part 3 item 136: legal notebook entries live in the existing case register as kind NOTE (no second store).
ALTER TABLE "office_case_register" DROP CONSTRAINT IF EXISTS "office_case_register_kind_check";
ALTER TABLE "office_case_register" ADD CONSTRAINT "office_case_register_kind_check" CHECK ("kind" IN ('ENFORCEMENT','EXPERT_MISSION','POA','CORRESPONDENCE','CUSTODY','MONEY','CHECKLIST','NOTE'));
