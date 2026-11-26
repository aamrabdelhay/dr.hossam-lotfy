-- Part 1 items 85 and 86. Additive only.
CREATE TABLE IF NOT EXISTS "office_forms" (
  "id" TEXT PRIMARY KEY, "title" VARCHAR(150) NOT NULL, "definition" JSONB NOT NULL, "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_by" TEXT, "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS "office_form_responses" (
  "id" TEXT PRIMARY KEY, "form_id" TEXT NOT NULL REFERENCES "office_forms"("id") ON DELETE CASCADE, "answers" JSONB NOT NULL,
  "submitted_by" TEXT, "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS "office_form_responses_form_idx" ON "office_form_responses" ("form_id","submitted_at" DESC);
