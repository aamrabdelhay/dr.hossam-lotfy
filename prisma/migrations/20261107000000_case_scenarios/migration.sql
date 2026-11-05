CREATE TABLE IF NOT EXISTS "office_case_scenarios" (
  "id" TEXT NOT NULL,
  "case_id" TEXT NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "trigger_condition" VARCHAR(1500) NOT NULL DEFAULT '',
  "possible_outcome" VARCHAR(3000) NOT NULL,
  "response_plan" VARCHAR(4000) NOT NULL DEFAULT '',
  "risk_notes" VARCHAR(3000) NOT NULL DEFAULT '',
  "next_steps" JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof("next_steps") = 'array' AND jsonb_array_length("next_steps") <= 20),
  "target_date" DATE,
  "status" VARCHAR(16) NOT NULL DEFAULT 'DRAFT'
    CHECK ("status" IN ('DRAFT','ACTIVE','SELECTED','ARCHIVED')),
  "created_by_user_id" TEXT,
  "created_by_lawyer_id" TEXT,
  "updated_by_user_id" TEXT,
  "updated_by_lawyer_id" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "office_case_scenarios_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "office_case_scenarios_case_fk" FOREIGN KEY ("case_id") REFERENCES "case_records"("id") ON DELETE CASCADE,
  CONSTRAINT "office_case_scenarios_creator_user_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "office_case_scenarios_creator_lawyer_fk" FOREIGN KEY ("created_by_lawyer_id") REFERENCES "lawyers"("id") ON DELETE SET NULL,
  CONSTRAINT "office_case_scenarios_updater_user_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "office_case_scenarios_updater_lawyer_fk" FOREIGN KEY ("updated_by_lawyer_id") REFERENCES "lawyers"("id") ON DELETE SET NULL,
  CONSTRAINT "office_case_scenarios_creator_check" CHECK (num_nonnulls("created_by_user_id","created_by_lawyer_id") <= 1),
  CONSTRAINT "office_case_scenarios_updater_check" CHECK (num_nonnulls("updated_by_user_id","updated_by_lawyer_id") <= 1)
);
CREATE INDEX IF NOT EXISTS "office_case_scenarios_case_status_updated_idx"
  ON "office_case_scenarios" ("case_id","status","updated_at" DESC);
CREATE INDEX IF NOT EXISTS "office_case_scenarios_target_date_idx"
  ON "office_case_scenarios" ("target_date") WHERE "status" <> 'ARCHIVED';

CREATE UNIQUE INDEX IF NOT EXISTS "office_case_scenarios_one_selected_per_case_uq" ON "office_case_scenarios" ("case_id") WHERE "status" = 'SELECTED';
