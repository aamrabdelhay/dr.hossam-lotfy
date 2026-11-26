-- Part 3 item 185: directory of experts, translators and service providers. Additive. Entries are deactivated, never deleted.
CREATE TABLE IF NOT EXISTS "office_directory" (
  "id" TEXT PRIMARY KEY,
  "kind" VARCHAR(10) NOT NULL CHECK ("kind" IN ('EXPERT','TRANSLATOR','PROVIDER')),
  "name" VARCHAR(200) NOT NULL, "specialty" VARCHAR(200), "phone" VARCHAR(40), "email" VARCHAR(200), "notes" VARCHAR(1000),
  "active" BOOLEAN NOT NULL DEFAULT TRUE, "created_by" TEXT, "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS "office_directory_kind_idx" ON "office_directory" ("kind","name");
