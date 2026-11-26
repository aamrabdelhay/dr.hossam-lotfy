import 'server-only';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { SessionUser } from '@/lib/auth';

export const actorKey = (s: SessionUser) => (s.role === 'admin' ? `admin:${s.userId}` : `lawyer:${s.lawyerId}`);
const rid = (p: string) => p + '_' + crypto.randomUUID().replaceAll('-', '');
const MAX_JSON = 20000; // bytes; keeps personal rows small

// Only these preference keys exist. Values are validated, never free-form.
export const PREF_SCHEMAS = {
  theme: z.enum(['light', 'dark', 'system']),
  fontScale: z.number().min(0.85).max(1.6),
  layout: z.object({ widgets: z.array(z.enum(['today', 'upcoming', 'requests', 'recent', 'favorites'])).max(5) }),
  columns: z.record(z.string().max(40), z.array(z.string().max(40)).max(40)).refine((v) => Object.keys(v).length <= 20, 'too many tables'),
  quickActions: z.array(z.enum(['new-session', 'new-client', 'new-case', 'search', 'my-day', 'requests'])).max(8),
} as const;
export type PrefKey = keyof typeof PREF_SCHEMAS;

export async function getPrefs(s: SessionUser) {
  const rows = await prisma.$queryRawUnsafe<{ pref_key: string; value: unknown }[]>(`SELECT "pref_key","value" FROM "office_user_prefs" WHERE "actor_key"=$1`, actorKey(s));
  return Object.fromEntries(rows.map((r) => [r.pref_key, r.value]));
}
export async function setPref(s: SessionUser, key: PrefKey, value: unknown) {
  const parsed = PREF_SCHEMAS[key].parse(value);
  await prisma.$executeRawUnsafe(
    `INSERT INTO "office_user_prefs" ("actor_key","pref_key","value") VALUES ($1,$2,$3::jsonb)
     ON CONFLICT ("actor_key","pref_key") DO UPDATE SET "value"=EXCLUDED."value","updated_at"=NOW()`, actorKey(s), key, JSON.stringify(parsed));
  return parsed;
}

export const itemSchema = z.object({
  kind: z.enum(['RECENT', 'FAVORITE']), itemType: z.enum(['case', 'client', 'session', 'lawyer', 'location', 'page']),
  itemId: z.string().min(1).max(120), label: z.string().min(1).max(200),
  href: z.string().max(300).regex(/^\/(?!\/)[^\s]*$/, 'internal link only'),
});
export async function touchItem(s: SessionUser, i: z.infer<typeof itemSchema>) {
  await prisma.$executeRawUnsafe(
    `INSERT INTO "office_recent_items" ("id","actor_key","kind","item_type","item_id","label","href") VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT ("actor_key","kind","item_type","item_id") DO UPDATE SET "label"=EXCLUDED."label","href"=EXCLUDED."href","touched_at"=NOW()`,
    rid('rec'), actorKey(s), i.kind, i.itemType, i.itemId, i.label, i.href);
  if (i.kind === 'RECENT') await prisma.$executeRawUnsafe(
    `DELETE FROM "office_recent_items" WHERE "actor_key"=$1 AND "kind"='RECENT' AND "id" NOT IN
     (SELECT "id" FROM "office_recent_items" WHERE "actor_key"=$1 AND "kind"='RECENT' ORDER BY "touched_at" DESC LIMIT 30)`, actorKey(s));
}
export const listItems = (s: SessionUser) => prisma.$queryRawUnsafe<any[]>(
  `SELECT "id","kind","item_type" AS "itemType","item_id" AS "itemId","label","href","touched_at" AS "touchedAt" FROM "office_recent_items" WHERE "actor_key"=$1 ORDER BY "touched_at" DESC LIMIT 80`, actorKey(s));
export const removeItem = (s: SessionUser, id: string) => prisma.$executeRawUnsafe(`DELETE FROM "office_recent_items" WHERE "id"=$1 AND "actor_key"=$2`, id, actorKey(s));

export const filterSchema = z.object({ scope: z.string().min(1).max(40).regex(/^[a-z0-9_-]+$/), name: z.string().min(1).max(80), filter: z.record(z.string(), z.unknown()) });
export async function saveFilter(s: SessionUser, f: z.infer<typeof filterSchema>) {
  if (JSON.stringify(f.filter).length > MAX_JSON) throw new Error('filter too large');
  await prisma.$executeRawUnsafe(
    `INSERT INTO "office_saved_filters" ("id","actor_key","scope","name","filter") VALUES ($1,$2,$3,$4,$5::jsonb)
     ON CONFLICT ("actor_key","scope","name") DO UPDATE SET "filter"=EXCLUDED."filter"`, rid('flt'), actorKey(s), f.scope, f.name, JSON.stringify(f.filter));
}
export const listFilters = (s: SessionUser, scope?: string) => prisma.$queryRawUnsafe<any[]>(
  `SELECT "id","scope","name","filter" FROM "office_saved_filters" WHERE "actor_key"=$1 AND ($2::text IS NULL OR "scope"=$2) ORDER BY "scope","name" LIMIT 200`, actorKey(s), scope ?? null);
export const deleteFilter = (s: SessionUser, id: string) => prisma.$executeRawUnsafe(`DELETE FROM "office_saved_filters" WHERE "id"=$1 AND "actor_key"=$2`, id, actorKey(s));

export const draftSchema = z.object({ formKey: z.string().min(1).max(80).regex(/^[a-z0-9_.-]+$/), recordRef: z.string().max(120).default(''), data: z.record(z.string(), z.unknown()) });
const KEEP_VERSIONS = 20;
export async function saveDraft(s: SessionUser, d: z.infer<typeof draftSchema>) {
  if (JSON.stringify(d.data).length > MAX_JSON) throw new Error('draft too large');
  const k = actorKey(s);
  const [{ v }] = await prisma.$queryRawUnsafe<{ v: number }[]>(`SELECT COALESCE(MAX("version"),0)+1 AS v FROM "office_form_drafts" WHERE "actor_key"=$1 AND "form_key"=$2 AND "record_ref"=$3`, k, d.formKey, d.recordRef);
  await prisma.$executeRawUnsafe(`INSERT INTO "office_form_drafts" ("id","actor_key","form_key","record_ref","version","data") VALUES ($1,$2,$3,$4,$5,$6::jsonb)`, rid('drf'), k, d.formKey, d.recordRef, Number(v), JSON.stringify(d.data));
  await prisma.$executeRawUnsafe(`DELETE FROM "office_form_drafts" WHERE "actor_key"=$1 AND "form_key"=$2 AND "record_ref"=$3 AND "version"<=$4`, k, d.formKey, d.recordRef, Number(v) - KEEP_VERSIONS);
  return Number(v);
}
export const listDrafts = (s: SessionUser, formKey: string, recordRef: string) => prisma.$queryRawUnsafe<any[]>(
  `SELECT "version","data","created_at" AS "createdAt" FROM "office_form_drafts" WHERE "actor_key"=$1 AND "form_key"=$2 AND "record_ref"=$3 ORDER BY "version" DESC LIMIT ${KEEP_VERSIONS}`, actorKey(s), formKey, recordRef);
export const clearDrafts = (s: SessionUser, formKey: string, recordRef: string) => prisma.$executeRawUnsafe(`DELETE FROM "office_form_drafts" WHERE "actor_key"=$1 AND "form_key"=$2 AND "record_ref"=$3`, actorKey(s), formKey, recordRef);

// Undo: entries are written ONLY by server code after a permitted change. Clients cannot supply the snapshot.
const UNDO_MINUTES = 15;
export async function recordUndo(s: SessionUser, resourceType: 'task', resourceId: string, label: string, before: Record<string, unknown>) {
  try {
    await prisma.$executeRawUnsafe(`INSERT INTO "office_undo_log" ("id","actor_key","resource_type","resource_id","label","before","expires_at") VALUES ($1,$2,$3,$4,$5,$6::jsonb, NOW() + ($7 || ' minutes')::interval)`,
      rid('und'), actorKey(s), resourceType, resourceId, label.slice(0, 200), JSON.stringify(before), String(UNDO_MINUTES));
  } catch { /* undo is best-effort and must never block the real change */ }
}
export const listUndo = (s: SessionUser) => prisma.$queryRawUnsafe<any[]>(
  `SELECT "id","resource_type" AS "resourceType","resource_id" AS "resourceId","label","created_at" AS "createdAt","expires_at" AS "expiresAt" FROM "office_undo_log" WHERE "actor_key"=$1 AND "undone_at" IS NULL AND "expires_at">NOW() ORDER BY "created_at" DESC LIMIT 20`, actorKey(s));
export async function applyUndo(s: SessionUser, id: string): Promise<{ ok: boolean; reason?: string }> {
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "office_undo_log" WHERE "id"=$1 AND "actor_key"=$2 AND "undone_at" IS NULL AND "expires_at">NOW()`, id, actorKey(s));
  const e = rows[0]; if (!e) return { ok: false, reason: 'not-found-or-expired' };
  if (e.resource_type === 'task') {
    const b = e.before as { description: string; notes: string | null; scheduledDate: string | null; scheduledTime: string | null; status: string };
    await prisma.task.update({ where: { id: e.resource_id }, data: { description: b.description, notes: b.notes, scheduledDate: b.scheduledDate ? new Date(b.scheduledDate) : null, scheduledTime: b.scheduledTime, status: b.status as never } });
  } else return { ok: false, reason: 'unsupported-resource' };
  await prisma.$executeRawUnsafe(`UPDATE "office_undo_log" SET "undone_at"=NOW() WHERE "id"=$1`, id);
  return { ok: true };
}
