-- Extend LocationType enum with the new legal destination types
ALTER TYPE "LocationType" ADD VALUE IF NOT EXISTS 'TAX_OFFICE';
ALTER TYPE "LocationType" ADD VALUE IF NOT EXISTS 'COMMERCIAL_REGISTRY';
ALTER TYPE "LocationType" ADD VALUE IF NOT EXISTS 'CIVIL_REGISTRY';
ALTER TYPE "LocationType" ADD VALUE IF NOT EXISTS 'PROSECUTION';
ALTER TYPE "LocationType" ADD VALUE IF NOT EXISTS 'LAWYERS_SYNDICATE';
ALTER TYPE "LocationType" ADD VALUE IF NOT EXISTS 'SURVEY_AUTHORITY';
ALTER TYPE "LocationType" ADD VALUE IF NOT EXISTS 'PASSPORTS';
ALTER TYPE "LocationType" ADD VALUE IF NOT EXISTS 'TRAFFIC';
ALTER TYPE "LocationType" ADD VALUE IF NOT EXISTS 'SOCIAL_INSURANCE';
ALTER TYPE "LocationType" ADD VALUE IF NOT EXISTS 'LABOR_OFFICE';
ALTER TYPE "LocationType" ADD VALUE IF NOT EXISTS 'CUSTOMS';

-- Expand UserRole (ADMIN kept as legacy alias of SUPER_ADMIN)
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'OFFICE_MANAGER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'LAWYER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SECRETARY';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'VIEWER';

-- Extend locations with the full directory profile
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "nameEn" TEXT;
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "subType" TEXT;
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "governorate" TEXT;
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "district" TEXT;
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "googleMapsUrl" TEXT;
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "lat" DOUBLE PRECISION;
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "lng" DOUBLE PRECISION;
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "workingHours" TEXT;
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "services" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "jurisdiction" TEXT;
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "requiresPersonal" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "hasOnlineService" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "lastVerified" TIMESTAMP(3);
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "confidence" TEXT;
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "distanceFromDokki" DOUBLE PRECISION;
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "distanceBucket" TEXT;
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "buildingId" TEXT;
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "searchKeywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS "locations_governorate_idx" ON "locations"("governorate");
CREATE INDEX IF NOT EXISTS "locations_distanceFromDokki_idx" ON "locations"("distanceFromDokki");

-- Opaque server-side sessions (cookie holds a random token, never a CUID)
CREATE TABLE IF NOT EXISTS "auth_sessions" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "userRole" TEXT,
    "userId" TEXT,
    "lawyerId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "auth_sessions_tokenHash_key" ON "auth_sessions"("tokenHash");
CREATE INDEX IF NOT EXISTS "auth_sessions_userId_idx" ON "auth_sessions"("userId");
CREATE INDEX IF NOT EXISTS "auth_sessions_lawyerId_idx" ON "auth_sessions"("lawyerId");
CREATE INDEX IF NOT EXISTS "auth_sessions_expiresAt_idx" ON "auth_sessions"("expiresAt");
