import 'server-only';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

export const DEMO_COOKIE = 'hl_demo_mode';
export const DEMO_TAG = '(ديمو)';

let schemaReady: Promise<void> | null = null;

async function ensureDemoLockSetting(): Promise<void> {
  if (!schemaReady) {
    schemaReady = prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "site_settings" (
        "key" TEXT PRIMARY KEY,
        "value" TEXT NOT NULL,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `).then(() => undefined).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
  await prisma.$executeRawUnsafe(`
    INSERT INTO "site_settings" ("key", "value")
    VALUES ('demo_locked', '0')
    ON CONFLICT ("key") DO NOTHING
  `);
}

export async function isDemoLocked(): Promise<boolean> {
  await ensureDemoLockSetting();
  const rows = await prisma.$queryRawUnsafe<Array<{ value: string }>>(
    `SELECT "value" FROM "site_settings" WHERE "key" = 'demo_locked' LIMIT 1`,
  );
  return rows[0]?.value === '1';
}

export async function lockDemoMode(): Promise<void> {
  await ensureDemoLockSetting();
  await prisma.$executeRawUnsafe(`
    INSERT INTO "site_settings" ("key", "value", "updated_at")
    VALUES ('demo_locked', '1', now())
    ON CONFLICT ("key") DO UPDATE SET "value" = '1', "updated_at" = now()
  `);
}

export async function isDemoMode(): Promise<boolean> {
  if (await isDemoLocked()) return false;
  const jar = await cookies();
  return jar.get(DEMO_COOKIE)?.value === '1';
}

export function tagDemoText(value: string | null | undefined): string {
  if (!value) return value ?? '';
  return value.includes(DEMO_TAG) ? value : `${value} ${DEMO_TAG}`;
}

export function demoTextFilter(field: 'description' | 'name' | 'bio') {
  return { [field]: { contains: DEMO_TAG } } as Record<string, unknown>;
}