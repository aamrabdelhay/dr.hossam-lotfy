CREATE TABLE IF NOT EXISTS "office_expenses" (
  "id" text PRIMARY KEY,
  "description" text NOT NULL,
  "category" text,
  "amount" numeric(14,2) NOT NULL DEFAULT 0,
  "status" text NOT NULL DEFAULT 'PENDING',
  "created_by_user_id" text,
  "created_by_lawyer_id" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "paid_at" timestamptz
);
CREATE INDEX IF NOT EXISTS "office_expenses_created_idx" ON "office_expenses"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "office_expenses_status_idx" ON "office_expenses"("status");