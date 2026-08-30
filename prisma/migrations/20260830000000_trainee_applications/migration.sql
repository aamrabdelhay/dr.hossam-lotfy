CREATE TABLE IF NOT EXISTS "trainee_applications" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "college" TEXT NOT NULL,
  "year" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "linkedin" TEXT,
  "experiences" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "whyTraining" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "trainee_applications_createdAt_idx" ON "trainee_applications"("createdAt");
