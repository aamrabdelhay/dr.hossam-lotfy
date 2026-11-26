import 'server-only';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { SessionUser } from '@/lib/auth';
import { getBranchScope } from '@/lib/branch-access';
import { isSeniorManagement } from '@/lib/office-workflow';
import { logAuditEvent } from '@/lib/audit';
import { ApiError } from '@/lib/api';

export const KINDS = ['MINUTES', 'DECISION', 'VISITOR', 'INCIDENT', 'MAINTENANCE', 'LOAN', 'DELEGATION', 'HANDOVER', 'ABSENCE', 'PRINT'] as const;
export const createSchema = z.object({ kind: z.enum(KINDS), title: z.string().trim().min(2).max(300), body: z.string().max(5000).optional(), occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), branchId: z.string().max(100).optional(), endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() })
  .refine((v) => !v.endsOn || !v.occurredOn || v.endsOn >= v.occurredOn, { message: 'تاريخ النهاية قبل البداية', path: ['endsOn'] })
  .refine((v) => !['DELEGATION', 'ABSENCE'].includes(v.kind) || !!v.endsOn, { message: 'تاريخ النهاية مطلوب للتفويض والغياب', path: ['endsOn'] });
export const patchSchema = z.object({ id: z.string().min(1), status: z.enum(['OPEN', 'CLOSED']) });
const aid = (s: SessionUser) => ({ actorUserId: s.role === 'admin' ? s.userId : null, actorLawyerId: s.role === 'lawyer' ? s.lawyerId : null });

/** Senior management sees all branches; a branch office manager sees and writes only the branches they manage. Everyone else is refused. */
export async function logScope(s: SessionUser) {
  if (await isSeniorManagement(s)) return { all: true, branches: [] as string[] };
  const sc = await getBranchScope(s);
  if (sc.officeManager) return { all: false, branches: sc.officeManagerBranchIds };
  throw new ApiError(403, 'سجل المكتب للإدارة ومديري المكاتب فقط');
}
export async function listLog(s: SessionUser, kind?: string) {
  const sc = await logScope(s);
  return prisma.$queryRawUnsafe<{ id: string; kind: string; branch_id: string; title: string; body: string | null; occurred_on: string; ends_on: string | null; status: string; expiry: string | null }[]>(
    `SELECT "id","kind","branch_id","title","body",to_char("occurred_on",'YYYY-MM-DD') AS occurred_on,to_char("ends_on",'YYYY-MM-DD') AS ends_on,"status",
      CASE WHEN "ends_on" IS NULL THEN NULL WHEN "ends_on" < CURRENT_DATE THEN 'EXPIRED' WHEN "ends_on" <= CURRENT_DATE + 14 THEN 'EXPIRING' ELSE 'ACTIVE' END AS expiry FROM "office_log"
      WHERE ($1::text IS NULL OR "kind"=$1) AND ($2::boolean OR "branch_id" = ANY($3::text[])) ORDER BY "occurred_on" DESC,"created_at" DESC LIMIT 200`, kind ?? null, sc.all, sc.branches);
}
export async function addLog(s: SessionUser, i: z.infer<typeof createSchema>) {
  const sc = await logScope(s); const branch = i.branchId ?? (sc.all ? 'branch_main' : sc.branches[0]);
  if (!sc.all && !sc.branches.includes(branch)) throw new ApiError(403, 'هذا الفرع خارج نطاقك');
  const id = 'olg_' + crypto.randomUUID().replaceAll('-', '');
  await prisma.$executeRawUnsafe(`INSERT INTO "office_log" ("id","kind","branch_id","title","body","occurred_on","ends_on","created_by") VALUES ($1,$2,$3,$4,$5,COALESCE($6::date,CURRENT_DATE),$7::date,$8)`, id, i.kind, branch, i.title, i.body ?? null, i.occurredOn ?? null, i.endsOn ?? null, s.role === 'admin' ? 'admin:' + s.userId : 'lawyer:' + s.lawyerId);
  await logAuditEvent({ ...aid(s), action: 'OFFICE_LOG_ADDED', resourceType: 'office_log', resourceId: id, summary: i.kind + ': ' + i.title, metadata: { kind: i.kind, branch } });
  return { id };
}
export async function setStatus(s: SessionUser, i: z.infer<typeof patchSchema>) {
  const sc = await logScope(s);
  const n = await prisma.$executeRawUnsafe(`UPDATE "office_log" SET "status"=$1 WHERE "id"=$2 AND ($3::boolean OR "branch_id" = ANY($4::text[]))`, i.status, i.id, sc.all, sc.branches);
  if (!n) throw new ApiError(404, 'غير موجود');
  await logAuditEvent({ ...aid(s), action: 'OFFICE_LOG_STATUS', resourceType: 'office_log', resourceId: i.id, summary: 'حالة ' + i.status });
  return { ok: true };
}
