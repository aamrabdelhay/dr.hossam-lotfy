-- Protected file deletion workflow: a request must be approved by senior management.
ALTER TABLE "office_archive" ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS "office_archive_expires_idx"
  ON "office_archive" ("expires_at") WHERE "expires_at" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "office_file_deletion_requests" (
  "id" TEXT PRIMARY KEY,
  "file_type" TEXT NOT NULL CHECK ("file_type" IN ('client','case')),
  "file_id" TEXT NOT NULL,
  "resource_id" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "file_kind" TEXT NOT NULL,
  "mime_type" TEXT,
  "size_bytes" BIGINT,
  "storage_url" TEXT NOT NULL,
  "text_content" TEXT,
  "reason" TEXT NOT NULL,
  "requested_by_user_id" TEXT,
  "requested_by_lawyer_id" TEXT,
  "requested_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "status" TEXT NOT NULL DEFAULT 'PENDING'
    CHECK ("status" IN ('PENDING','APPROVED','REJECTED','RESTORED','PURGED')),
  "decided_by_user_id" TEXT,
  "decided_by_lawyer_id" TEXT,
  "decided_at" TIMESTAMPTZ,
  "decision_note" TEXT,
  "archive_id" TEXT,
  "archive_expires_at" TIMESTAMPTZ,
  "purged_at" TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS "office_file_delete_pending_uq"
  ON "office_file_deletion_requests" ("file_type","file_id") WHERE "status" = 'PENDING';
CREATE INDEX IF NOT EXISTS "office_file_delete_status_idx"
  ON "office_file_deletion_requests" ("status","requested_at" DESC);
CREATE INDEX IF NOT EXISTS "office_file_delete_archive_expiry_idx"
  ON "office_file_deletion_requests" ("archive_expires_at") WHERE "status" = 'APPROVED';
