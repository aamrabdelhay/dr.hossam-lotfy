CREATE TABLE IF NOT EXISTS "office_case_security" (
  "id" TEXT NOT NULL,
  "case_id" TEXT NOT NULL,
  "classification" TEXT NOT NULL DEFAULT 'INTERNAL'
    CHECK ("classification" IN ('INTERNAL','CONFIDENTIAL','HIGHLY_CONFIDENTIAL')),
  "ethical_wall_enabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "reason" VARCHAR(1000),
  "created_by_user_id" TEXT,
  "created_by_lawyer_id" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "office_case_security_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "office_case_security_case_uq" UNIQUE ("case_id"),
  CONSTRAINT "office_case_security_case_fk" FOREIGN KEY ("case_id") REFERENCES "case_records"("id") ON DELETE CASCADE,
  CONSTRAINT "office_case_security_user_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "office_case_security_lawyer_fk" FOREIGN KEY ("created_by_lawyer_id") REFERENCES "lawyers"("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "office_case_security_classification_idx" ON "office_case_security" ("classification","ethical_wall_enabled");
CREATE TABLE IF NOT EXISTS "office_case_access_grants" (
  "id" TEXT NOT NULL,
  "case_id" TEXT NOT NULL,
  "user_id" TEXT,
  "lawyer_id" TEXT,
  "access_level" TEXT NOT NULL DEFAULT 'VIEW' CHECK ("access_level" IN ('VIEW','EDIT')),
  "created_by_user_id" TEXT,
  "created_by_lawyer_id" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "office_case_access_grants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "office_case_access_grants_case_fk" FOREIGN KEY ("case_id") REFERENCES "case_records"("id") ON DELETE CASCADE,
  CONSTRAINT "office_case_access_grants_user_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "office_case_access_grants_lawyer_fk" FOREIGN KEY ("lawyer_id") REFERENCES "lawyers"("id") ON DELETE CASCADE,
  CONSTRAINT "office_case_access_grants_created_user_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "office_case_access_grants_created_lawyer_fk" FOREIGN KEY ("created_by_lawyer_id") REFERENCES "lawyers"("id") ON DELETE SET NULL,
  CONSTRAINT "office_case_access_grants_identity_check" CHECK (num_nonnulls("user_id","lawyer_id") = 1)
);
CREATE UNIQUE INDEX IF NOT EXISTS "office_case_access_grants_case_user_uq" ON "office_case_access_grants" ("case_id","user_id") WHERE "user_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "office_case_access_grants_case_lawyer_uq" ON "office_case_access_grants" ("case_id","lawyer_id") WHERE "lawyer_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "office_case_access_grants_user_idx" ON "office_case_access_grants" ("user_id","case_id");
CREATE INDEX IF NOT EXISTS "office_case_access_grants_lawyer_idx" ON "office_case_access_grants" ("lawyer_id","case_id");
CREATE TABLE IF NOT EXISTS "office_case_security_events" (
  "id" TEXT NOT NULL,
  "case_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "summary" VARCHAR(500) NOT NULL,
  "actor_user_id" TEXT,
  "actor_lawyer_id" TEXT,
  "details_json" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "office_case_security_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "office_case_security_events_case_fk" FOREIGN KEY ("case_id") REFERENCES "case_records"("id") ON DELETE CASCADE,
  CONSTRAINT "office_case_security_events_user_fk" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "office_case_security_events_lawyer_fk" FOREIGN KEY ("actor_lawyer_id") REFERENCES "lawyers"("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "office_case_security_events_case_date_idx" ON "office_case_security_events" ("case_id","created_at" DESC);
