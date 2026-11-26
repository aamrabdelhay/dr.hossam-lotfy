-- Part 3 items 150/152: document type, tags and version chain on the existing case_files table. Additive. Old versions are kept; nothing is deleted.
ALTER TABLE "case_files" ADD COLUMN IF NOT EXISTS "doc_type" VARCHAR(40);
ALTER TABLE "case_files" ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "case_files" ADD COLUMN IF NOT EXISTS "version_of" TEXT;
ALTER TABLE "case_files" ADD COLUMN IF NOT EXISTS "version_no" INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS "case_files_version_of_idx" ON "case_files" ("version_of");
