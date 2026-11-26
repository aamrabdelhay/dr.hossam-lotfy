import 'server-only';
import { prisma } from '@/lib/prisma';
import type { SessionUser } from '@/lib/auth';

const ownerSql = (s: SessionUser) => (s.role === 'admin' ? { col: '"userId"', id: s.userId } : { col: '"lawyerId"', id: s.lawyerId });
async function owns(s: SessionUser, notificationId: string) {
  const o = ownerSql(s);
  const r = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`SELECT "id" FROM "notifications" WHERE "id"=$1 AND ${o.col}=$2`, notificationId, o.id);
  return r.length > 0;
}
/** Only the owner of a notification may change its priority. */
export async function setPriority(s: SessionUser, id: string, priority: 'LOW' | 'NORMAL' | 'HIGH') {
  if (!(await owns(s, id))) return false;
  await prisma.$executeRawUnsafe(`INSERT INTO "office_notification_meta" ("notification_id","priority") VALUES ($1,$2) ON CONFLICT ("notification_id") DO UPDATE SET "priority"=EXCLUDED."priority"`, id, priority);
  return true;
}
/** Snooze up to 14 days ahead. Passing null clears it. */
export async function snooze(s: SessionUser, id: string, until: Date | null) {
  if (!(await owns(s, id))) return false;
  if (until && (until.getTime() < Date.now() || until.getTime() > Date.now() + 14 * 86400e3)) return false;
  await prisma.$executeRawUnsafe(`INSERT INTO "office_notification_meta" ("notification_id","snoozed_until") VALUES ($1,$2::timestamptz) ON CONFLICT ("notification_id") DO UPDATE SET "snoozed_until"=EXCLUDED."snoozed_until"`, id, until ? until.toISOString() : null);
  return true;
}
export async function snoozedIds(s: SessionUser): Promise<string[]> {
  const o = ownerSql(s);
  const r = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`SELECT n."id" FROM "notifications" n JOIN "office_notification_meta" m ON m."notification_id"=n."id" WHERE n.${o.col}=$1 AND m."snoozed_until" > now()`, o.id);
  return r.map((x) => x.id);
}
/** Unread, not snoozed, last 24 hours, grouped by priority (HIGH first). Counts and titles only, no extra data. */
export async function dailyDigest(s: SessionUser) {
  const o = ownerSql(s);
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; title: string; type: string; priority: string }>>(
    `SELECT n."id", n."title", n."type", COALESCE(m."priority",'NORMAL') AS priority FROM "notifications" n LEFT JOIN "office_notification_meta" m ON m."notification_id"=n."id"
     WHERE n.${o.col}=$1 AND n."readAt" IS NULL AND n."createdAt" > now() - interval '24 hours' AND (m."snoozed_until" IS NULL OR m."snoozed_until" <= now())
     ORDER BY CASE COALESCE(m."priority",'NORMAL') WHEN 'HIGH' THEN 0 WHEN 'NORMAL' THEN 1 ELSE 2 END, n."createdAt" DESC LIMIT 100`, o.id);
  return { total: rows.length, byPriority: { HIGH: rows.filter((r) => r.priority === 'HIGH'), NORMAL: rows.filter((r) => r.priority === 'NORMAL'), LOW: rows.filter((r) => r.priority === 'LOW') }, delivery: 'on-demand (no scheduled send is configured)' };
}
