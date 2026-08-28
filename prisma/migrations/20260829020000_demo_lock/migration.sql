CREATE TABLE IF NOT EXISTS "site_settings" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key")
);

INSERT INTO "site_settings" ("key", "value")
VALUES ('demo_locked', '0')
ON CONFLICT ("key") DO NOTHING;
