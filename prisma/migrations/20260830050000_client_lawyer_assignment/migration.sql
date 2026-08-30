ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "assignedLawyerId" TEXT;
CREATE INDEX IF NOT EXISTS "clients_assignedLawyerId_idx" ON "clients"("assignedLawyerId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clients_assignedLawyerId_fkey') THEN
    ALTER TABLE "clients" ADD CONSTRAINT "clients_assignedLawyerId_fkey" FOREIGN KEY ("assignedLawyerId") REFERENCES "lawyers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
