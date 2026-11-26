-- Part 1 group A: personal workspace (items 69, 70, 72, 73, 75, 77, 78, 79, 88). Additive only.
CREATE TABLE IF NOT EXISTS "office_user_prefs" (
  "actor_key" TEXT NOT NULL,
  "pref_key" VARCHAR(60) NOT NULL,
  "value" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "office_user_prefs_pkey" PRIMARY KEY ("actor_key","pref_key")
);
CREATE TABLE IF NOT EXISTS "office_recent_items" (
  "id" TEXT NOT NULL,
  "actor_key" TEXT NOT NULL,
  "kind" VARCHAR(10) NOT NULL CHECK ("kind" IN ('RECENT','FAVORITE')),
  "item_type" VARCHAR(30) NOT NULL,
  "item_id" TEXT NOT NULL,
  "label" VARCHAR(200) NOT NULL,
  "href" VARCHAR(300) NOT NULL,
  "touched_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "office_recent_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "office_recent_items_uq" UNIQUE ("actor_key","kind","item_type","item_id")
);
CREATE INDEX IF NOT EXISTS "office_recent_items_actor_idx" ON "office_recent_items" ("actor_key","kind","touched_at" DESC);
CREATE TABLE IF NOT EXISTS "office_saved_filters" (
  "id" TEXT NOT NULL,
  "actor_key" TEXT NOT NULL,
  "scope" VARCHAR(40) NOT NULL,
  "name" VARCHAR(80) NOT NULL,
  "filter" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "office_saved_filters_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "office_saved_filters_uq" UNIQUE ("actor_key","scope","name")
);
CREATE TABLE IF NOT EXISTS "office_form_drafts" (
  "id" TEXT NOT NULL,
  "actor_key" TEXT NOT NULL,
  "form_key" VARCHAR(80) NOT NULL,
  "record_ref" VARCHAR(120) NOT NULL DEFAULT '',
  "version" INTEGER NOT NULL,
  "data" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "office_form_drafts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "office_form_drafts_uq" UNIQUE ("actor_key","form_key","record_ref","version")
);
CREATE TABLE IF NOT EXISTS "office_undo_log" (
  "id" TEXT NOT NULL,
  "actor_key" TEXT NOT NULL,
  "resource_type" VARCHAR(30) NOT NULL,
  "resource_id" TEXT NOT NULL,
  "label" VARCHAR(200) NOT NULL,
  "before" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "expires_at" TIMESTAMPTZ NOT NULL,
  "undone_at" TIMESTAMPTZ,
  CONSTRAINT "office_undo_log_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "office_undo_log_actor_idx" ON "office_undo_log" ("actor_key","created_at" DESC);
