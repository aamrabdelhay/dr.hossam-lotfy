import 'server-only';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { SessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export const KINDS = ['ENFORCEMENT', 'EXPERT_MISSION', 'POA', 'CORRESPONDENCE', 'CUSTODY', 'MONEY', 'CHECKLIST', 'NOTE', 'OBLIGATION'] as const;
export type Kind = (typeof KINDS)[number];
// Fields allowed inside "data" per kind. Anything else is dropped, so the register cannot become a free-form dump.
const DATA_KEYS: Record<Kind, string[]> = {
  ENFORCEMENT: ['stage', 'court', 'reference', 'notes'],
  EXPERT_MISSION: ['expertName', 'body', 'assignedOn', 'reportDue', 'notes'],
  POA: ['grantor', 'grantee', 'number', 'issuedOn', 'expiresOn', 'scope'],
  CORRESPONDENCE: ['direction', 'party', 'referenceNo', 'sentOn', 'notes'],
  CUSTODY: ['item', 'fromPerson', 'toPerson', 'location', 'action'],
  MONEY: ['type', 'direction', 'reference', 'notes'],
  CHECKLIST: ['phase', 'done'],
  NOTE: ['body', 'topic', 'sourceRef'],
  OBLIGATION: ['contractRef', 'party', 'obligation', 'sourceClause', 'notes'],
};
export const createSchema = z.object({
  kind: z.enum(KINDS), title: z.string().min(1).max(300),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  amount: z.number().finite().min(0).max(1e10).optional(),
  data: z.record(z.string(), z.union([z.string().max(1000), z.boolean(), z.number()])).default({}),
});
export const patchSchema = z.object({ itemId: z.string().min(1), status: z.enum(['OPEN', 'DONE', 'CANCELLED']).optional(), title: z.string().min(1).max(300).optional(), dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(), data: z.record(z.string(), z.union([z.string().max(1000), z.boolean(), z.number()])).optional() });

const who = (s: SessionUser) => (s.role === 'admin' ? `admin:${s.userId}` : `lawyer:${s.lawyerId}`);
const aid = (s: SessionUser) => ({ actorUserId: s.role === 'admin' ? s.userId : null, actorLawyerId: s.role === 'lawyer' ? s.lawyerId : null });
const clean = (kind: Kind, d: Record<string, unknown>) => Object.fromEntries(Object.entries(d).filter(([k]) => DATA_KEYS[kind].includes(k)));

export const listItems = (caseId: string, kind?: Kind) => prisma.$queryRawUnsafe<any[]>(
  `SELECT "id","kind","title","status","due_date","amount","data","created_by","created_at" FROM "office_case_register" WHERE "case_id"=$1 AND ($2::text IS NULL OR "kind"=$2) ORDER BY "created_at" DESC LIMIT 500`, caseId, kind ?? null);

export async function createItem(s: SessionUser, caseId: string, i: z.infer<typeof createSchema>) {
  if (i.kind === 'MONEY' && i.amount === undefined) return { error: 'amount-required' as const };
  const id = 'reg_' + crypto.randomUUID().replaceAll('-', '');
  await prisma.$executeRawUnsafe(`INSERT INTO "office_case_register" ("id","case_id","kind","title","due_date","amount","data","created_by") VALUES ($1,$2,$3,$4,$5::date,$6,$7::jsonb,$8)`,
    id, caseId, i.kind, i.title, i.dueDate ?? null, i.amount ?? null, JSON.stringify(clean(i.kind, i.data)), who(s));
  await logAuditEvent({ ...aid(s), action: 'CASE_REGISTER_ADD', resourceType: 'case', resourceId: caseId, summary: 'Added ' + i.kind, metadata: { itemId: id } });
  return { ok: true as const, id };
}
/** CUSTODY rows are an append-only chain: they can never be edited, only a new row added. Money and others: status/title/data edits are audited. */
export async function patchItem(s: SessionUser, caseId: string, p: z.infer<typeof patchSchema>) {
  const [row] = await prisma.$queryRawUnsafe<any[]>(`SELECT "kind","data" FROM "office_case_register" WHERE "id"=$1 AND "case_id"=$2`, p.itemId, caseId);
  if (!row) return { error: 'not-found' as const };
  if (row.kind === 'CUSTODY') return { error: 'custody-is-append-only' as const };
  const data = p.data ? { ...row.data, ...clean(row.kind, p.data) } : row.data;
  await prisma.$executeRawUnsafe(`UPDATE "office_case_register" SET "status"=COALESCE($3,"status"),"title"=COALESCE($4,"title"),"due_date"=CASE WHEN $5::boolean THEN $6::date ELSE "due_date" END,"data"=$7::jsonb,"updated_at"=NOW() WHERE "id"=$1 AND "case_id"=$2`,
    p.itemId, caseId, p.status ?? null, p.title ?? null, p.dueDate !== undefined, p.dueDate ?? null, JSON.stringify(data));
  await logAuditEvent({ ...aid(s), action: 'CASE_REGISTER_EDIT', resourceType: 'case', resourceId: caseId, summary: 'Edited ' + row.kind, metadata: { itemId: p.itemId, status: p.status } });
  return { ok: true as const };
}
