-- Part 3 item 162 (legal translation memory, entered by people, no machine translation) and item 160 (print center jobs use the existing office log as kind PRINT). Additive.
CREATE TABLE IF NOT EXISTS "office_translation_memory" (
  "id" TEXT PRIMARY KEY, "source_lang" VARCHAR(2) NOT NULL CHECK ("source_lang" IN ('ar','en','fr')), "target_lang" VARCHAR(2) NOT NULL CHECK ("target_lang" IN ('ar','en','fr')),
  "source_text" VARCHAR(500) NOT NULL, "target_text" VARCHAR(500) NOT NULL, "source_ref" VARCHAR(300), "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_by" TEXT, "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(), CHECK ("source_lang" <> "target_lang"));
CREATE INDEX IF NOT EXISTS "office_translation_memory_idx" ON "office_translation_memory" ("source_lang","target_lang");
ALTER TABLE "office_log" DROP CONSTRAINT IF EXISTS "office_log_kind_check";
ALTER TABLE "office_log" ADD CONSTRAINT "office_log_kind_check" CHECK ("kind" IN ('MINUTES','DECISION','VISITOR','INCIDENT','MAINTENANCE','LOAN','DELEGATION','HANDOVER','ABSENCE','PRINT'));
