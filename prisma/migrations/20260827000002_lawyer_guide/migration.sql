-- Lawyer Guide: normalized relational entities
-- Additive migration — never drops existing tables or data

-- ─── Verification statuses ───
CREATE TYPE "VerificationStatus" AS ENUM ('DRAFT', 'PENDING', 'VERIFIED', 'NEEDS_REVIEW', 'ARCHIVED');

-- ─── Relationship types ───
CREATE TYPE "RelationshipType" AS ENUM (
  'LOCATED_IN', 'PART_OF', 'SUBORDINATE_TO',
  'JURISDICTION_OF', 'SERVES', 'REFERS_TO',
  'ASSOCIATED_WITH', 'SAME_BUILDING',
  'MOVED_FROM', 'MOVED_TO'
);

-- ─── Confidence levels ───
CREATE TYPE "ConfidenceLevel" AS ENUM ('VERIFIED', 'HIGH', 'MEDIUM', 'LOW', 'NEEDS_VERIFICATION');

-- ─── Organizations (parent entities) ───
CREATE TABLE IF NOT EXISTS "organizations" (
    "id" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'government',
    "description" TEXT,
    "officialUrl" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "organizations_slug_key" ON "organizations"("slug");

-- ─── Categories (master list) ───
CREATE TABLE IF NOT EXISTS "categories" (
    "id" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "categories_slug_key" ON "categories"("slug");
CREATE INDEX IF NOT EXISTS "categories_parentId_idx" ON "categories"("parentId");

-- ─── Services (first-class entities) ───
CREATE TABLE IF NOT EXISTS "services" (
    "id" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "categoryId" TEXT,
    "description" TEXT,
    "onlineAvailable" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "services_slug_key" ON "services"("slug");
CREATE INDEX IF NOT EXISTS "services_categoryId_idx" ON "services"("categoryId");

-- ─── Jurisdictions ───
CREATE TABLE IF NOT EXISTS "jurisdictions" (
    "id" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "type" TEXT NOT NULL DEFAULT 'geographic',
    "governorate" TEXT,
    "city" TEXT,
    "district" TEXT,
    "description" TEXT,
    "source" TEXT,
    "effectiveFrom" DATE,
    "effectiveTo" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "jurisdictions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "jurisdictions_governorate_idx" ON "jurisdictions"("governorate");

-- ─── Link locations to organizations ───
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
CREATE INDEX IF NOT EXISTS "locations_organizationId_idx" ON "locations"("organizationId");

-- ─── Location → Category link ───
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;
CREATE INDEX IF NOT EXISTS "locations_categoryId_idx" ON "locations"("categoryId");

-- ─── Location verification ───
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'VERIFIED';
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "confidenceLevel" "ConfidenceLevel" NOT NULL DEFAULT 'HIGH';
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "officialUrl" TEXT;
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "normalizedName" TEXT;

-- ─── Location → Services (many-to-many) ───
CREATE TABLE IF NOT EXISTS "location_services" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
    CONSTRAINT "location_services_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "location_services_locationId_serviceId_key" ON "location_services"("locationId", "serviceId");
CREATE INDEX IF NOT EXISTS "location_services_locationId_idx" ON "location_services"("locationId");
CREATE INDEX IF NOT EXISTS "location_services_serviceId_idx" ON "location_services"("serviceId");

-- ─── Location → Jurisdictions (many-to-many) ───
CREATE TABLE IF NOT EXISTS "location_jurisdictions" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "jurisdictionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
    CONSTRAINT "location_jurisdictions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "location_jurisdictions_locationId_jurisdictionId_key" ON "location_jurisdictions"("locationId", "jurisdictionId");
CREATE INDEX IF NOT EXISTS "location_jurisdictions_locationId_idx" ON "location_jurisdictions"("locationId");

-- ─── Location relationships ───
CREATE TABLE IF NOT EXISTS "location_relationships" (
    "id" TEXT NOT NULL,
    "fromLocationId" TEXT NOT NULL,
    "toLocationId" TEXT NOT NULL,
    "type" "RelationshipType" NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
    CONSTRAINT "location_relationships_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "location_relationships_from_idx" ON "location_relationships"("fromLocationId");
CREATE INDEX IF NOT EXISTS "location_relationships_to_idx" ON "location_relationships"("toLocationId");

-- ─── Sources ───
CREATE TABLE IF NOT EXISTS "sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "type" TEXT NOT NULL DEFAULT 'official',
    "authority" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- ─── Location → Sources ───
CREATE TABLE IF NOT EXISTS "location_sources" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "checkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
    CONSTRAINT "location_sources_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "location_sources_locationId_idx" ON "location_sources"("locationId");

-- ─── Verification records ───
CREATE TABLE IF NOT EXISTS "verification_records" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "verifiedById" TEXT,
    "status" "VerificationStatus" NOT NULL,
    "notes" TEXT,
    "sourceId" TEXT,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
    CONSTRAINT "verification_records_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "verification_records_locationId_idx" ON "verification_records"("locationId");

-- ─── Opening hours ───
CREATE TABLE IF NOT EXISTS "opening_hours" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "opens" TEXT,
    "closes" TEXT,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
    CONSTRAINT "opening_hours_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "opening_hours_locationId_idx" ON "opening_hours"("locationId");

-- ─── Data change history ───
CREATE TABLE IF NOT EXISTS "data_change_history" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT,
    "reason" TEXT,
    "changedById" TEXT,
    "effectiveFrom" DATE,
    "effectiveTo" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
    CONSTRAINT "data_change_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "data_change_history_locationId_idx" ON "data_change_history"("locationId");
CREATE INDEX IF NOT EXISTS "data_change_history_field_idx" ON "data_change_history"("field");

-- ─── Admin settings (configurable office location etc.) ───
CREATE TABLE IF NOT EXISTS "admin_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
    CONSTRAINT "admin_settings_pkey" PRIMARY KEY ("key")
);

-- Insert default office setting
INSERT INTO "admin_settings" ("key", "value") VALUES ('office_lat', '30.038') ON CONFLICT ("key") DO NOTHING;
INSERT INTO "admin_settings" ("key", "value") VALUES ('office_lng', '31.2') ON CONFLICT ("key") DO NOTHING;
INSERT INTO "admin_settings" ("key", "value") VALUES ('office_label', 'الدقي – الجيزة') ON CONFLICT ("key") DO NOTHING;

-- ─── Seed categories ───
INSERT INTO "categories" ("id", "nameAr", "nameEn", "slug", "sortOrder") VALUES
  ('cat-courts', 'المحاكم', 'Courts', 'courts', 1),
  ('cat-prosecution', 'النيابة العامة', 'Public Prosecution', 'prosecution', 2),
  ('cat-admin-prosecution', 'النيابة الإدارية', 'Administrative Prosecution', 'admin-prosecution', 3),
  ('cat-state-lawsuits', 'هيئة قضايا الدولة', 'State Lawsuits Authority', 'state-lawsuits', 4),
  ('cat-state-council', 'مجلس الدولة', 'State Council', 'state-council', 5),
  ('cat-supreme-constitutional', 'المحكمة الدستورية العليا', 'Supreme Constitutional Court', 'supreme-constitutional', 6),
  ('cat-military-judiciary', 'القضاء العسكري', 'Military Judiciary', 'military-judiciary', 7),
  ('cat-experts', 'الخبراء', 'Court Experts', 'experts', 8),
  ('cat-forensic', 'الطب الشرعي', 'Forensic Medicine', 'forensic', 9),
  ('cat-execution', 'التنفيذ والقضاء', 'Execution & Enforcement', 'execution', 10),
  ('cat-prisons', 'السجون والإصلاح', 'Prisons / Correction', 'prisons', 11),
  ('cat-police', 'الشرطة والأدلة الجنائية', 'Police / Criminal Investigation', 'police', 12),
  ('cat-real-estate-reg', 'الشهر العقاري', 'Real Estate Registration', 'real-estate-reg', 13),
  ('cat-notary', 'التوثيق', 'Notary / Documentation', 'notary', 14),
  ('cat-survey', 'المساحة والمساحة المساحية', 'Land Registry / Survey', 'survey', 15),
  ('cat-re-tax', 'ضريبة العقارات', 'Real Estate Tax', 're-tax', 16),
  ('cat-commercial-registry', 'السجل التجاري', 'Commercial Registry', 'commercial-registry', 17),
  ('cat-chambers', 'غرف التجارة', 'Chambers of Commerce', 'chambers', 18),
  ('cat-gafi', 'الاستثمار (الهيئة العامة)', 'GAFI / Investment', 'gafi', 19),
  ('cat-fra', 'الرقابة المالية', 'FRA / Financial Regulation', 'fra', 20),
  ('cat-exchange', 'البورصة المصرية', 'Egyptian Exchange', 'exchange', 21),
  ('cat-industrial', 'التنمية الصناعية', 'Industrial Development', 'industrial', 22),
  ('cat-export-import', 'الصادرات والواردات', 'Export & Import Control', 'export-import', 23),
  ('cat-customs', 'الجمارك', 'Customs', 'customs', 24),
  ('cat-tax', 'مصلحة الضرائب', 'Tax Authority', 'tax', 25),
  ('cat-social-insurance', 'التأمينات الاجتماعية', 'Social Insurance', 'social-insurance', 26),
  ('cat-labour', 'القوى العاملة', 'Labour', 'labour', 27),
  ('cat-civil-status', 'الأحوال المدنية', 'Civil Status', 'civil-status', 28),
  ('cat-passports', 'الجوازات والهجرة', 'Passports / Immigration', 'passports', 29),
  ('cat-traffic', 'المرور', 'Traffic', 'traffic', 30),
  ('cat-bar-association', 'نقابة المحامين', 'Bar Association', 'bar-association', 31),
  ('cat-local-gov', 'الإدارة المحلية', 'Local Government', 'local-gov', 32),
  ('cat-districts', 'الأحياء والمدن', 'Districts / Cities', 'districts', 33),
  ('cat-building', 'البناء والتراخيص', 'Building / Planning / Licensing', 'building', 34),
  ('cat-state-property', 'أملاك الدولة', 'State Property', 'state-property', 35),
  ('cat-utilities', 'المرافق', 'Utilities', 'utilities', 36),
  ('cat-environment', 'البيئة', 'Environment', 'environment', 37),
  ('cat-agriculture', 'الزراعة', 'Agriculture', 'agriculture', 38),
  ('cat-consumer', 'حماية المستهلك', 'Consumer Protection', 'consumer', 39),
  ('cat-competition', 'جهاز حماية المنافسة', 'Competition Authority', 'competition', 40),
  ('cat-ip', 'الملكية الفكرية', 'Intellectual Property', 'ip', 41),
  ('cat-medical-committees', 'اللجان الطبية الرسمية', 'Medical / Official Committees', 'medical-committees', 42),
  ('cat-government-hospitals', 'المستشفيات الحكومية', 'Government Hospitals', 'government-hospitals', 43),
  ('cat-post', 'البريد الحكومي', 'Government Postal Services', 'post', 44),
  ('cat-ports-airports', 'الموانئ والمطارات', 'Ports / Airports', 'ports-airports', 45),
  ('cat-service-centers', 'مراكز خدمة المواطنين', 'Government Service Centers', 'service-centers', 46),
  ('cat-other', 'جهات أخرى', 'Other Authorities', 'other', 99)
ON CONFLICT ("id") DO NOTHING;

-- ─── Seed services ───
INSERT INTO "services" ("id", "nameAr", "nameEn", "slug") VALUES
  ('svc-draw-power-of-attorney', 'عمل توكيل', 'Draw Power of Attorney', 'draw-power-of-attorney'),
  ('svc-authenticate-documents', 'توثيق مستندات', 'Authenticate Documents', 'authenticate-documents'),
  ('svc-register-company', 'تسجيل شركة', 'Register Company', 'register-company'),
  ('svc-commercial-registry', 'استخراج سجل تجاري', 'Extract Commercial Registry', 'commercial-registry-extract'),
  ('svc-file-lawsuit', 'رفع دعوى قضائية', 'File Lawsuit', 'file-lawsuit'),
  ('svc-attend-session', 'حضور جلسة', 'Attend Session', 'attend-session'),
  ('svc-execution-judgment', 'تنفيذ حكم', 'Execute Judgment', 'execution-judgment'),
  ('svc-property-registration', 'تسجيل عقار', 'Register Property', 'property-registration'),
  ('svc-tax-registration', 'تسجيل ضريبي', 'Tax Registration', 'tax-registration'),
  ('svc-tax-return', 'تقديم إقرار ضريبي', 'File Tax Return', 'tax-return'),
  ('svc-social-insurance', 'خدمات تأمينات', 'Social Insurance Services', 'social-insurance-services'),
  ('svc-civil-status-id', 'استخراج بطاقة رقم قومي', 'National ID', 'national-id'),
  ('svc-birth-certificate', 'استخراج شهادة ميلاد', 'Birth Certificate', 'birth-certificate'),
  ('svc-death-certificate', 'استخراج شهادة وفاة', 'Death Certificate', 'death-certificate'),
  ('svc-marriage-certificate', 'توثيق زواج', 'Marriage Certificate', 'marriage-certificate'),
  ('svc-divorce-certificate', 'توثيق طلاق', 'Divorce Certificate', 'divorce-certificate'),
  ('svc-passport-issuance', 'إصدار جواز سفر', 'Issue Passport', 'passport-issuance'),
  ('svc-traffic-license', 'ترخيص مركبة', 'Vehicle License', 'vehicle-license'),
  ('svc-driving-license', 'رخصة قيادة', 'Driving License', 'driving-license'),
  ('svc-legal-consultation', 'استشارة قانونية', 'Legal Consultation', 'legal-consultation'),
  ('svc-forensic-report', 'تقرير طبي شرعي', 'Forensic Medical Report', 'forensic-report'),
  ('svc-expert-opinion', 'رأي خبير', 'Expert Opinion', 'expert-opinion'),
  ('svc-enforce-rent', 'تنفيذ إخلاء', 'Enforce Eviction', 'enforce-eviction'),
  ('svc-company-amendment', 'تعديل شركة', 'Company Amendment', 'company-amendment'),
  ('svc-investment-license', 'ترخيص استثمار', 'Investment License', 'investment-license'),
  ('svc-customs-clearance', 'تخليص جمركي', 'Customs Clearance', 'customs-clearance'),
  ('svc-building-permit', 'ترخيص بناء', 'Building Permit', 'building-permit'),
  ('svc-data-correction', 'تصحيح بيانات', 'Data Correction', 'data-correction')
ON CONFLICT ("id") DO NOTHING;

-- Index for normalized search
CREATE INDEX IF NOT EXISTS "locations_normalizedName_idx" ON "locations"("normalizedName");
CREATE INDEX IF NOT EXISTS "locations_verificationStatus_idx" ON "locations"("verificationStatus");
