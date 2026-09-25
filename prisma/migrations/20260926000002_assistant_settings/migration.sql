CREATE TABLE IF NOT EXISTS "assistant_settings" (
  "id" text PRIMARY KEY,
  "base_url" text NOT NULL,
  "model" text NOT NULL,
  "api_key_encrypted" text,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
