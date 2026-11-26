-- Part 1 item 93. Additive only. Templates only; nothing is ever sent from the app.
CREATE TABLE IF NOT EXISTS "office_wa_templates" (
  "id" TEXT PRIMARY KEY, "name" VARCHAR(120) NOT NULL UNIQUE, "body" VARCHAR(1500) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE, "created_by" TEXT, "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW());
