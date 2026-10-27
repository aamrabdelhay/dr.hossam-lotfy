CREATE TABLE IF NOT EXISTS "client_events" (
  "id" TEXT PRIMARY KEY,
  "client_id" TEXT NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "description" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'note',
  "author_name" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "client_events_client_created_idx"
  ON "client_events" ("client_id", "created_at" DESC);
