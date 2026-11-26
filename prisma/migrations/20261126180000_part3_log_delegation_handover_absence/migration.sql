-- Part 3 items 179 (administrative delegations calendar), 186 (hand-over record), 172 (absence coverage record) use the existing office log. An end date is added for delegations and absences.
ALTER TABLE "office_log" ADD COLUMN IF NOT EXISTS "ends_on" DATE;
ALTER TABLE "office_log" DROP CONSTRAINT IF EXISTS "office_log_kind_check";
ALTER TABLE "office_log" ADD CONSTRAINT "office_log_kind_check" CHECK ("kind" IN ('MINUTES','DECISION','VISITOR','INCIDENT','MAINTENANCE','LOAN','DELEGATION','HANDOVER','ABSENCE'));
