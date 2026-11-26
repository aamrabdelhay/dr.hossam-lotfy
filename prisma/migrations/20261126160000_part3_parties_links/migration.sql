-- Part 3 items 127/128/135: case parties and links between cases. Additive. Parties are deactivated and links are ended, never deleted.
CREATE TABLE IF NOT EXISTS "office_case_parties" (
  "id" TEXT PRIMARY KEY, "case_id" TEXT NOT NULL REFERENCES "case_records"("id") ON DELETE CASCADE,
  "role" VARCHAR(12) NOT NULL CHECK ("role" IN ('CLIENT','OPPONENT','WITNESS','EXPERT','OTHER')),
  "name" VARCHAR(200) NOT NULL, "phone" VARCHAR(40), "note" VARCHAR(500),
  "active" BOOLEAN NOT NULL DEFAULT TRUE, "created_by" TEXT, "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS "office_case_parties_case_idx" ON "office_case_parties" ("case_id");
CREATE INDEX IF NOT EXISTS "office_case_parties_name_idx" ON "office_case_parties" (lower("name"), "role");
CREATE TABLE IF NOT EXISTS "office_case_links" (
  "id" TEXT PRIMARY KEY, "case_id" TEXT NOT NULL REFERENCES "case_records"("id") ON DELETE CASCADE,
  "related_case_id" TEXT NOT NULL REFERENCES "case_records"("id") ON DELETE CASCADE,
  "relation" VARCHAR(12) NOT NULL CHECK ("relation" IN ('PARENT','APPEAL','RELATED','CONSOLIDATED')),
  "note" VARCHAR(500), "active" BOOLEAN NOT NULL DEFAULT TRUE, "created_by" TEXT, "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ("case_id" <> "related_case_id"));
CREATE INDEX IF NOT EXISTS "office_case_links_case_idx" ON "office_case_links" ("case_id");
CREATE INDEX IF NOT EXISTS "office_case_links_rel_idx" ON "office_case_links" ("related_case_id");
