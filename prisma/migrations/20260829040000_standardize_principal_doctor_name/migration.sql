-- Standardize the principal doctor's stored display name.
-- The project maps Prisma's Lawyer model to the existing `lawyers` table.
UPDATE "lawyers"
SET "fullName" = 'Dr.hossam lotfi'
WHERE "isPrincipal" = true
  AND lower(trim("fullName")) IN ('dr.hossam lotfy', 'dr. hossam lotfy', 'dr hossam lotfy', 'hossam lotfy');
