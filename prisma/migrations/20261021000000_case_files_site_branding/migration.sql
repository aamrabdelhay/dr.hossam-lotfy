CREATE TABLE IF NOT EXISTS "case_files" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "case_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "mime_type" TEXT,
  "size_bytes" BIGINT,
  "url" TEXT,
  "created_by_user_id" TEXT,
  "created_by_lawyer_id" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deleted_at" TIMESTAMPTZ,
  CONSTRAINT "case_files_case_id_fkey"
    FOREIGN KEY ("case_id") REFERENCES "case_records"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "case_files_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "case_files_created_by_lawyer_id_fkey"
    FOREIGN KEY ("created_by_lawyer_id") REFERENCES "lawyers"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "case_files_case_created_idx"
  ON "case_files" ("case_id", "created_at" DESC)
  WHERE "deleted_at" IS NULL;

CREATE TABLE IF NOT EXISTS "office_site_settings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "logo_data_url" TEXT,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO "office_site_settings" ("id", "logo_data_url", "updated_at")
VALUES ('default', NULL, NOW())
ON CONFLICT ("id") DO NOTHING;
