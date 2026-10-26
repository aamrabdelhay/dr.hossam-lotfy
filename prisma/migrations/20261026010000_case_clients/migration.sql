CREATE TABLE IF NOT EXISTS "case_clients" (
  "id" text PRIMARY KEY,
  "case_id" text NOT NULL REFERENCES "case_records"("id") ON DELETE CASCADE,
  "client_id" text NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
  "created_at" timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT "case_clients_case_id_client_id_key" UNIQUE ("case_id", "client_id")
);
CREATE INDEX IF NOT EXISTS "case_clients_client_id_idx" ON "case_clients"("client_id");
CREATE INDEX IF NOT EXISTS "case_clients_case_id_idx" ON "case_clients"("case_id");
INSERT INTO "case_clients" ("id","case_id","client_id")
SELECT 'cc_' || md5(cr."id" || ':' || cr."clientId"), cr."id", cr."clientId"
FROM "case_records" cr
JOIN "clients" c ON c."id"=cr."clientId"
WHERE cr."clientId" IS NOT NULL
ON CONFLICT ("case_id","client_id") DO NOTHING;
