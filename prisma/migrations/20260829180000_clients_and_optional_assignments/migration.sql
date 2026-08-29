CREATE TABLE IF NOT EXISTS "clients" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "nationalId" TEXT,
  "address" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "clients_name_idx" ON "clients"("name");
ALTER TABLE "case_records" ADD COLUMN IF NOT EXISTS "clientId" TEXT;
CREATE INDEX IF NOT EXISTS "case_records_clientId_idx" ON "case_records"("clientId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'case_records_clientId_fkey') THEN
    ALTER TABLE "case_records" ADD CONSTRAINT "case_records_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
ALTER TABLE "tasks" ALTER COLUMN "locationId" DROP NOT NULL;
