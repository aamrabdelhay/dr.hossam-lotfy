-- ─────────────────────────────────────────────────────────────────────────────
-- Privacy: remove contact / address / map links for courts & legal places.
--
-- This is deliberately a DATA cleanup, not a schema drop: the columns stay
-- nullable so the app degrades safely while every deployed row is scrubbed.
-- prisma/seed-locations.ts also re-scrubs on every deploy (sanitize step), so
-- this migration is the "one-time + convergent" guarantee for existing rows.
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE "locations" SET
  "address"        = NULL,
  "phone"          = NULL,
  "email"          = NULL,
  "website"        = NULL,
  "googleMapsUrl"  = NULL;

-- Same rule for the organization relation used by the Lawyer Guide.
UPDATE "organizations" SET
  "phone" = NULL,
  "email" = NULL;
