UPDATE "lawyers"
SET "profilePhotoUrl" = NULL,
    "coverPhotoUrl" = NULL
WHERE "profilePhotoUrl" IS NOT NULL
   OR "coverPhotoUrl" IS NOT NULL;
