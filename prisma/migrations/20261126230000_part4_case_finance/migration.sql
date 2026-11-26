-- Part 4 items 190, 193-199, 201-204: one append-only finance ledger per case (records only; it moves no money and gives no tax or legal advice).
-- Kinds: FEE_AGREEMENT, INSTALLMENT (due_on), INVOICE, PAYMENT, EXPENSE (reimbursable, paid by the office for the client), BUDGET (expected expenses ceiling), EXTRA_SCOPE (extra work needing a new fee), QUOTE, TRUST_IN, TRUST_OUT (client money, separate balance, may not go below zero).
-- Rows are never deleted; a wrong entry is CANCELLED by finance management.
CREATE TABLE IF NOT EXISTS "case_finance_entries" (
  "id" TEXT PRIMARY KEY, "case_id" TEXT NOT NULL,
  "kind" VARCHAR(20) NOT NULL CHECK ("kind" IN ('FEE_AGREEMENT','INSTALLMENT','INVOICE','PAYMENT','EXPENSE','BUDGET','EXTRA_SCOPE','QUOTE','TRUST_IN','TRUST_OUT')),
  "amount" NUMERIC(14,2) NOT NULL CHECK ("amount" > 0), "currency" VARCHAR(3) NOT NULL DEFAULT 'EGP',
  "due_on" DATE, "status" VARCHAR(12) NOT NULL DEFAULT 'OPEN' CHECK ("status" IN ('OPEN','PAID','CANCELLED','ACCEPTED','REJECTED','REIMBURSED')),
  "ref_id" TEXT, "note" VARCHAR(500), "created_by" TEXT, "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updated_by" TEXT, "updated_at" TIMESTAMPTZ);
CREATE INDEX IF NOT EXISTS "case_finance_case_idx" ON "case_finance_entries" ("case_id","created_at");
CREATE INDEX IF NOT EXISTS "case_finance_due_idx" ON "case_finance_entries" ("due_on") WHERE "kind"='INSTALLMENT' AND "status"='OPEN';
