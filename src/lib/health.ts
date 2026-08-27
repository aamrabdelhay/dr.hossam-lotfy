import 'server-only';

import { Client } from 'pg';

/**
 * The migration runner records short names (for example `extend_location`),
 * while Prisma's own runner records the timestamped directory name. Health
 * checks deliberately accept both formats.
 */
export const EXPECTED_MIGRATIONS = ['init', 'extend_location', 'lawyer_guide', 'lawyer_access_approval_email_reminders'] as const;

const EXTENDED_LOCATION_COLUMNS = [
  'nameEn',
  'subType',
  'governorate',
  'city',
  'district',
  'phone',
  'email',
  'website',
  'googleMapsUrl',
  'lat',
  'lng',
  'workingHours',
  'services',
  'jurisdiction',
  'requiresPersonal',
  'hasOnlineService',
  'source',
  'lastVerified',
  'confidence',
  'distanceFromDokki',
  'distanceBucket',
  'buildingId',
  'searchKeywords',
] as const;

export type HealthStatus = 'ok' | 'degraded' | 'down';

export type HealthReport = {
  status: HealthStatus;
  env: {
    DATABASE_URL: boolean;
    SESSION_SECRET: boolean;
    NEXT_PUBLIC_SITE_URL: string | null;
    NODE_ENV: string | null;
  };
  database: {
    connected: boolean;
    error: string | null;
  };
  migrations: {
    applied: string[];
    expected: string[];
    missing: string[];
  };
  schema: {
    extendedLocationColumns: boolean;
    authSessionsTable: boolean;
  };
  data: {
    locations: number | null;
    courts: number | null;
    users: number | null;
    lawyers: number | null;
    tasks: number | null;
  };
  hints: string[];
};

/**
 * Never return a connection URL or password in the public health response (or
 * in logs that use this helper). PostgreSQL uses both postgres:// and
 * postgresql:// URLs, so cover both even though DATABASE_URL normally uses the
 * latter.
 */
export function redact(value: unknown): string {
  let message: string;

  if (value instanceof Error) {
    message = value.message || value.name;
  } else if (typeof value === 'string') {
    message = value;
  } else {
    try {
      message = JSON.stringify(value);
    } catch {
      message = String(value);
    }
  }

  return message
    .replace(/\bpostgres(?:ql)?:\/\/[^\s'"`<>()]*/gi, '[REDACTED_DATABASE_URL]')
    .replace(/\bpassword\s*=\s*(?:'[^']*'|"[^"]*"|[^\s,;)&]*)/gi, 'password=[REDACTED]');
}

/**
 * Next.js uses special errors while deciding whether a route can be statically
 * rendered. Those errors must escape the fail-soft app shell: swallowing one
 * turns a legitimate dynamic-rendering bailout into a broken static page.
 */
export function isFrameworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const candidate = error as { digest?: unknown; name?: unknown };
  const digest = typeof candidate.digest === 'string' ? candidate.digest : '';
  const name = typeof candidate.name === 'string' ? candidate.name : '';

  return (
    digest.startsWith('NEXT_') ||
    digest.includes('DYNAMIC_SERVER_USAGE') ||
    name === 'DynamicServerError' ||
    name === 'BailoutToCSRError'
  );
}

function migrationWasApplied(appliedName: string, expectedName: string): boolean {
  return appliedName === expectedName || appliedName.endsWith(`_${expectedName}`);
}

function toCount(value: unknown): number | null {
  const count = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(count) ? count : null;
}

async function tableExists(client: Client, table: string): Promise<boolean> {
  const result = await client.query<{ relation: string | null }>('SELECT to_regclass($1) AS relation', [table]);
  return Boolean(result.rows[0]?.relation);
}

async function locationColumns(client: Client): Promise<Set<string>> {
  const result = await client.query<{ column_name: string }>(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'locations'
      AND table_schema = ANY (current_schemas(false))
  `);
  return new Set(result.rows.map((row) => row.column_name));
}

async function countRows(client: Client, table: string, where = ''): Promise<number | null> {
  const result = await client.query<{ count: number | string }>(`SELECT COUNT(*)::int AS count FROM "${table}" ${where}`);
  return toCount(result.rows[0]?.count);
}

function emptyReport(): HealthReport {
  return {
    status: 'down',
    env: {
      DATABASE_URL: Boolean(process.env.DATABASE_URL),
      SESSION_SECRET: Boolean(process.env.SESSION_SECRET),
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || null,
      NODE_ENV: process.env.NODE_ENV || null,
    },
    database: { connected: false, error: null },
    migrations: {
      applied: [],
      expected: [...EXPECTED_MIGRATIONS],
      missing: [...EXPECTED_MIGRATIONS],
    },
    schema: { extendedLocationColumns: false, authSessionsTable: false },
    data: { locations: null, courts: null, users: null, lawyers: null, tasks: null },
    hints: [],
  };
}

/**
 * A public, read-only operational diagnostic. It intentionally uses `pg`
 * instead of the application Prisma singleton so it can still report a useful
 * result when DATABASE_URL is absent or the generated client cannot start.
 *
 * This function is fail-safe by design: callers always receive a report rather
 * than an exception, including when Neon is down or a migration is incomplete.
 */
export async function checkHealth(): Promise<HealthReport> {
  const report = emptyReport();

  if (!report.env.DATABASE_URL) {
    report.database.error = 'DATABASE_URL غير مضبوط.';
    report.hints.push('أضف DATABASE_URL الخاص بقاعدة Neon إلى متغيرات بيئة الإنتاج ثم أعد النشر.');
    if (!report.env.SESSION_SECRET) {
      report.hints.push('أضف SESSION_SECRET عشوائياً وطويلاً قبل تشغيل الموقع في الإنتاج.');
    }
    if (!report.env.NEXT_PUBLIC_SITE_URL) {
      report.hints.push('اضبط NEXT_PUBLIC_SITE_URL على رابط الموقع العام لتصحيح robots.txt وsitemap.xml.');
    }
    return report;
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5_000,
  });

  let inspectionError: string | null = null;

  try {
    await client.connect();
    report.database.connected = true;

    const migrationTable = await tableExists(client, '_prisma_migrations');
    if (migrationTable) {
      const result = await client.query<{ migration_name: string }>(
        'SELECT "migration_name" FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL ORDER BY "migration_name" ASC',
      );
      report.migrations.applied = result.rows.map((row) => row.migration_name);
      report.migrations.missing = EXPECTED_MIGRATIONS.filter(
        (expected) => !report.migrations.applied.some((applied) => migrationWasApplied(applied, expected)),
      );
    }

    // A pg Client executes one query at a time; keep these checks sequential
    // rather than issuing Promise.all on the same connection.
    const hasLocations = await tableExists(client, 'locations');
    const hasUsers = await tableExists(client, 'users');
    const hasLawyers = await tableExists(client, 'lawyers');
    const hasTasks = await tableExists(client, 'tasks');

    if (hasLocations) {
      const columns = await locationColumns(client);
      report.schema.extendedLocationColumns = EXTENDED_LOCATION_COLUMNS.every((column) => columns.has(column));
    }
    report.schema.authSessionsTable = await tableExists(client, 'auth_sessions');

    // Query counts independently so an unexpected missing table remains visible
    // as a null in its own field instead of hiding all other diagnostics.
    const safeCount = async (exists: boolean, table: string, where = ''): Promise<number | null> => {
      if (!exists) return null;
      try {
        return await countRows(client, table, where);
      } catch (error) {
        inspectionError ??= redact(error);
        return null;
      }
    };

    report.data.locations = await safeCount(hasLocations, 'locations');
    report.data.courts = await safeCount(hasLocations, 'locations', `WHERE "type" = 'COURT'`);
    report.data.users = await safeCount(hasUsers, 'users');
    report.data.lawyers = await safeCount(hasLawyers, 'lawyers');
    report.data.tasks = await safeCount(hasTasks, 'tasks');
  } catch (error) {
    inspectionError = redact(error);
  } finally {
    try {
      await client.end();
    } catch {
      // The report is already complete enough; closing a failed pg connection is best effort.
    }
  }

  if (inspectionError) report.database.error = inspectionError;

  if (!report.database.connected) {
    report.status = 'down';
    report.hints.push('تعذّر الاتصال بقاعدة البيانات. راجع DATABASE_URL واتصال مشروع Neon ثم أعد المحاولة.');
  } else {
    if (!report.env.SESSION_SECRET) {
      report.hints.push('SESSION_SECRET غير مضبوط؛ تسجيل الدخول والجلسات لن يعملا بأمان.');
    }
    if (!report.env.NEXT_PUBLIC_SITE_URL) {
      report.hints.push('NEXT_PUBLIC_SITE_URL غير مضبوط؛ راجع رابط robots.txt وsitemap.xml العام.');
    }
    if (report.migrations.missing.length > 0) {
      report.hints.push(
        `هناك migrations غير مطبقة: ${report.migrations.missing.join('، ')}. شغّل npm run db:migrate أو راجع سجل [migrate] في Vercel.`,
      );
    }
    if (!report.schema.extendedLocationColumns) {
      report.hints.push('أعمدة دليل الأماكن الموسّعة غير مكتملة؛ طبّق migration extend_location.');
    }
    if (!report.schema.authSessionsTable) {
      report.hints.push('جدول جلسات الدخول auth_sessions غير موجود؛ طبّق migration extend_location.');
    }
    if (Object.values(report.data).some((count) => count === null)) {
      report.hints.push('تعذّر قراءة كل عدادات البيانات؛ راجع صلاحيات قاعدة البيانات وبنية الجداول.');
    }
    if (inspectionError) {
      report.hints.push('حدث خطأ أثناء فحص قاعدة البيانات؛ التفاصيل في حقل database.error بعد إخفاء بيانات الاتصال.');
    }

    const hasProblem =
      !report.env.SESSION_SECRET ||
      !report.env.NEXT_PUBLIC_SITE_URL ||
      report.migrations.missing.length > 0 ||
      !report.schema.extendedLocationColumns ||
      !report.schema.authSessionsTable ||
      Object.values(report.data).some((count) => count === null) ||
      Boolean(inspectionError);

    report.status = hasProblem ? 'degraded' : 'ok';
    if (report.status === 'ok') {
      report.hints.push('الخدمة وقاعدة البيانات والمخطط جاهزة.');
    }
  }

  return report;
}
