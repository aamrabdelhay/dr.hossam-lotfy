-- Part 3 item 144 (library of precedents, judgments and memos: entered by lawyers, text only, no client data) and item 142 (playbooks: ordered steps that can be applied to a case as register checklist items). Additive; entries are deactivated, never deleted.
CREATE TABLE IF NOT EXISTS "office_library" (
  "id" TEXT PRIMARY KEY, "kind" VARCHAR(10) NOT NULL CHECK ("kind" IN ('PRECEDENT','JUDGMENT','MEMO')),
  "title" VARCHAR(300) NOT NULL, "court" VARCHAR(200), "decided_on" DATE, "summary" VARCHAR(4000), "source_ref" VARCHAR(300), "tags" TEXT[] NOT NULL DEFAULT '{}',
  "active" BOOLEAN NOT NULL DEFAULT TRUE, "created_by" TEXT, "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS "office_library_kind_idx" ON "office_library" ("kind","created_at" DESC);
CREATE TABLE IF NOT EXISTS "office_playbooks" (
  "id" TEXT PRIMARY KEY, "title" VARCHAR(200) NOT NULL, "category" VARCHAR(100), "steps" JSONB NOT NULL, "source_ref" VARCHAR(300),
  "active" BOOLEAN NOT NULL DEFAULT TRUE, "created_by" TEXT, "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW());
