-- Standardize the principal doctor's stored display name so every surface
-- that reads the Lawyer record uses the requested spelling.
UPDATE "Lawyer"
SET "fullName" = 'Dr.hossam lotfi'
WHERE "isPrincipal" = true
  AND lower(trim("fullName")) IN ('dr.hossam lotfy', 'dr. hossam lotfy', 'dr hossam lotfy', 'hossam lotfy');
