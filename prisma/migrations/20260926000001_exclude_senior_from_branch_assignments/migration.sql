-- Senior management is global and must never be assigned to a branch.
DELETE FROM "office_branch_lawyers"
WHERE "lawyer_id" IN (
  SELECT "lawyer_id" FROM "office_senior_members" WHERE "lawyer_id" IS NOT NULL
);
DELETE FROM "office_branch_managers"
WHERE "lawyer_id" IN (
  SELECT "lawyer_id" FROM "office_senior_members" WHERE "lawyer_id" IS NOT NULL
);
