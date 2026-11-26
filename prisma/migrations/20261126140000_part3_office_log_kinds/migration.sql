-- Part 3 items 184 (maintenance and support requests) and 161 (paper file loan and hand-over log) use the existing office log: no second store.
ALTER TABLE "office_log" DROP CONSTRAINT IF EXISTS "office_log_kind_check";
ALTER TABLE "office_log" ADD CONSTRAINT "office_log_kind_check" CHECK ("kind" IN ('MINUTES','DECISION','VISITOR','INCIDENT','MAINTENANCE','LOAN'));
