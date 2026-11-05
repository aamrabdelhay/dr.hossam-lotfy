-- Per-user permission overrides, temporary delegation, audit events, expiring file links,
-- and review-only retention policies. No customer data is automatically deleted by this migration.
CREATE TABLE IF NOT EXISTS "office_user_permission_overrides" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "permission_key" TEXT NOT NULL CHECK ("permission_key" IN ('manageUsers','manageLawyers','manageLocations','writeTasks','comment','viewAdmin')),
  "scope_key" TEXT NOT NULL DEFAULT 'GLOBAL',
  "allowed" BOOLEAN NOT NULL,
  "reason" VARCHAR(1000),
  "created_by_user_id" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "created_by_lawyer_id" TEXT REFERENCES "lawyers"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "revoked_at" TIMESTAMPTZ,
  CONSTRAINT "office_user_permission_overrides_scope_check" CHECK ("scope_key" = 'GLOBAL')
);
CREATE UNIQUE INDEX IF NOT EXISTS "office_user_permission_overrides_user_permission_scope_uq"
  ON "office_user_permission_overrides" ("user_id","permission_key","scope_key");
CREATE INDEX IF NOT EXISTS "office_user_permission_overrides_active_idx"
  ON "office_user_permission_overrides" ("user_id","permission_key") WHERE "revoked_at" IS NULL;

CREATE TABLE IF NOT EXISTS "office_permission_delegations" (
  "id" TEXT PRIMARY KEY,
  "grantee_user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "permission_key" TEXT NOT NULL CHECK ("permission_key" IN ('manageUsers','manageLawyers','manageLocations','writeTasks','comment','viewAdmin')),
  "reason" VARCHAR(1000) NOT NULL,
  "starts_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "expires_at" TIMESTAMPTZ NOT NULL,
  "revoked_at" TIMESTAMPTZ,
  "created_by_user_id" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "created_by_lawyer_id" TEXT REFERENCES "lawyers"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "office_permission_delegations_expiry_check" CHECK ("expires_at" > "starts_at")
);
CREATE INDEX IF NOT EXISTS "office_permission_delegations_active_idx"
  ON "office_permission_delegations" ("grantee_user_id","permission_key","expires_at")
  WHERE "revoked_at" IS NULL;

CREATE TABLE IF NOT EXISTS "office_audit_events" (
  "id" TEXT PRIMARY KEY,
  "actor_user_id" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "actor_lawyer_id" TEXT REFERENCES "lawyers"("id") ON DELETE SET NULL,
  "action" VARCHAR(100) NOT NULL,
  "resource_type" VARCHAR(80),
  "resource_id" TEXT,
  "summary" VARCHAR(1000) NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "ip_address" VARCHAR(80),
  "user_agent" VARCHAR(300),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "office_audit_events_created_idx" ON "office_audit_events" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "office_audit_events_actor_user_idx" ON "office_audit_events" ("actor_user_id","created_at" DESC);
CREATE INDEX IF NOT EXISTS "office_audit_events_resource_idx" ON "office_audit_events" ("resource_type","resource_id","created_at" DESC);

CREATE TABLE IF NOT EXISTS "office_secure_file_links" (
  "id" TEXT PRIMARY KEY,
  "token_hash" CHAR(64) NOT NULL UNIQUE,
  "file_type" TEXT NOT NULL CHECK ("file_type" IN ('case','client')),
  "file_id" TEXT NOT NULL,
  "resource_id" TEXT NOT NULL,
  "file_name" VARCHAR(240) NOT NULL,
  "mime_type" VARCHAR(180),
  "storage_url" TEXT NOT NULL,
  "created_by_user_id" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "created_by_lawyer_id" TEXT REFERENCES "lawyers"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "expires_at" TIMESTAMPTZ NOT NULL,
  "max_downloads" INTEGER NOT NULL DEFAULT 1 CHECK ("max_downloads" BETWEEN 1 AND 10),
  "download_count" INTEGER NOT NULL DEFAULT 0 CHECK ("download_count" >= 0),
  "last_accessed_at" TIMESTAMPTZ,
  "revoked_at" TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS "office_secure_file_links_expiry_idx"
  ON "office_secure_file_links" ("expires_at") WHERE "revoked_at" IS NULL;

CREATE TABLE IF NOT EXISTS "office_retention_policies" (
  "id" TEXT PRIMARY KEY,
  "resource_type" TEXT NOT NULL UNIQUE CHECK ("resource_type" IN ('case_file','client_file')),
  "retention_days" INTEGER NOT NULL CHECK ("retention_days" BETWEEN 30 AND 36500),
  "enabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "mode" TEXT NOT NULL DEFAULT 'REVIEW_ONLY' CHECK ("mode" = 'REVIEW_ONLY'),
  "updated_by_user_id" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_by_lawyer_id" TEXT REFERENCES "lawyers"("id") ON DELETE SET NULL,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "office_retention_reviews" (
  "id" TEXT PRIMARY KEY,
  "resource_type" TEXT NOT NULL CHECK ("resource_type" IN ('case_file','client_file')),
  "file_id" TEXT NOT NULL,
  "resource_id" TEXT NOT NULL,
  "file_name" VARCHAR(240) NOT NULL,
  "file_created_at" TIMESTAMPTZ NOT NULL,
  "detected_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING','RETAINED','ARCHIVE_REQUESTED')),
  "reviewed_by_user_id" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "reviewed_by_lawyer_id" TEXT REFERENCES "lawyers"("id") ON DELETE SET NULL,
  "reviewed_at" TIMESTAMPTZ,
  "review_note" VARCHAR(1000),
  CONSTRAINT "office_retention_reviews_resource_file_uq" UNIQUE ("resource_type","file_id")
);
CREATE INDEX IF NOT EXISTS "office_retention_reviews_status_idx"
  ON "office_retention_reviews" ("status","detected_at" DESC);
