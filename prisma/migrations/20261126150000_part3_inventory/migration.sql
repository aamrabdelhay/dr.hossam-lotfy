-- Part 3 item 182. Additive. Stock changes are append-only movements; the quantity is the sum of movements. Nothing is deleted.
CREATE TABLE IF NOT EXISTS "office_inventory_items" (
  "id" TEXT PRIMARY KEY, "branch_id" TEXT NOT NULL, "name" VARCHAR(200) NOT NULL, "unit" VARCHAR(30) NOT NULL DEFAULT 'قطعة',
  "min_qty" INTEGER NOT NULL DEFAULT 0 CHECK ("min_qty" >= 0), "active" BOOLEAN NOT NULL DEFAULT TRUE, "created_by" TEXT, "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS "office_inventory_moves" (
  "id" TEXT PRIMARY KEY, "item_id" TEXT NOT NULL REFERENCES "office_inventory_items"("id"),
  "delta" INTEGER NOT NULL CHECK ("delta" <> 0), "reason" VARCHAR(300), "created_by" TEXT, "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS "office_inventory_moves_item_idx" ON "office_inventory_moves" ("item_id","created_at");
