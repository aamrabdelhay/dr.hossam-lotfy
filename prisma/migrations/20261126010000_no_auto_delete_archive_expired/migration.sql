-- Rule: no file is deleted automatically. After the 31-day archive period the
-- request becomes ARCHIVE_EXPIRED and the file stays stored. Additive only.
ALTER TABLE "office_file_deletion_requests" DROP CONSTRAINT IF EXISTS "office_file_deletion_requests_status_check";
ALTER TABLE "office_file_deletion_requests" ADD CONSTRAINT "office_file_deletion_requests_status_check"
  CHECK ("status" IN ('PENDING','APPROVED','REJECTED','RESTORED','PURGED','ARCHIVE_EXPIRED'));
ALTER TABLE "office_file_deletion_requests" ADD COLUMN IF NOT EXISTS "archive_expired_at" TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS "office_file_delete_expired_idx"
  ON "office_file_deletion_requests" ("archive_expired_at") WHERE "status" = 'ARCHIVE_EXPIRED';
