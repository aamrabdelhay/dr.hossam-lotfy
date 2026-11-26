import crypto from 'node:crypto';
import { z } from 'zod';
import { ApiError, handle, json, readJson } from '@/lib/api';
import { logAuditEvent } from '@/lib/audit';
import { requireCaseFileAccess } from '@/lib/case-file-access';
import { installmentAlerts, profit, reconcile, statement, summarize, type FinRow } from '@/lib/case-finance';
import { isFinanceManagement } from '@/lib/office-workflow';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };
const KINDS = ['FEE_AGREEMENT', 'INSTALLMENT', 'INVOICE', 'PAYMENT', 'EXPENSE', 'BUDGET', 'EXTRA_SCOPE', 'QUOTE', 'TRUST_IN', 'TRUST_OUT'] as const;
const add = z.object({ kind: z.enum(KINDS), amount: z.number().positive().max(1_000_000_000), dueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), refId: z.string().max(80).optional(), note: z.string().trim().max(500).optional() });
const patch = z.object({ id: z.string().min(1), status: z.enum(['PAID', 'CANCELLED', 'ACCEPTED', 'REJECTED', 'REIMBURSED']) });
const ALLOWED: Record<string, string[]> = { INSTALLMENT: ['PAID', 'CANCELLED'], INVOICE: ['PAID', 'CANCELLED'], PAYMENT: ['CANCELLED'], EXPENSE: ['REIMBURSED', 'CANCELLED'], BUDGET: ['CANCELLED'], FEE_AGREEMENT: ['CANCELLED'], EXTRA_SCOPE: ['ACCEPTED', 'REJECTED', 'CANCELLED'], QUOTE: ['ACCEPTED', 'REJECTED', 'CANCELLED'], TRUST_IN: ['CANCELLED'], TRUST_OUT: ['CANCELLED'] };
async function gate(id: string) {
  const a = await requireCaseFileAccess(id);
  if (!(await isFinanceManagement(a.session))) throw new ApiError(403, 'السجل المالي للإدارة المالية والعليا فقط');
  return a;
}
const actorTag = (s: { role: string; userId?: string; lawyerId?: string }) => (s.role === 'admin' ? 'admin:' + s.userId : 'lawyer:' + s.lawyerId);
async function load(id: string) { return prisma.$queryRawUnsafe<FinRow[]>(`SELECT "id","case_id","kind","amount"::text AS amount,"currency",to_char("due_on",'YYYY-MM-DD') AS due_on,"status","ref_id","note","created_at"::text AS created_at FROM "case_finance_entries" WHERE "case_id"=$1 ORDER BY "created_at","id" LIMIT 2000`, id); }
/** Case finance ledger (items 190, 193-197, 199, 202, 203, 204). Finance management and senior management only, behind the case wall. Records only: no money moves, nothing is sent to a client. */
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params; await gate(id); const rows = await load(id); const today = new Date().toISOString().slice(0, 10);
  return json({ entries: rows, summary: summarize(rows), statement: statement(rows), flags: reconcile(rows), installments: installmentAlerts(rows, today), profit: profit(rows) });
});
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params; const a = await gate(id); const i = await readJson(req, add);
  if (i.kind === 'INSTALLMENT' && !i.dueOn) throw new ApiError(400, 'القسط يحتاج تاريخ استحقاق');
  const eid = 'fin_' + crypto.randomUUID().replaceAll('-', '');
  const who = actorTag(a.session as never);
  await prisma.$transaction(async (tx) => {
    if (i.kind === 'TRUST_OUT') {
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, 'trust:' + id);
      const [b] = await tx.$queryRawUnsafe<{ bal: string }[]>(`SELECT COALESCE(SUM(CASE WHEN "kind"='TRUST_IN' THEN "amount" ELSE -"amount" END),0)::text AS bal FROM "case_finance_entries" WHERE "case_id"=$1 AND "kind" IN ('TRUST_IN','TRUST_OUT') AND "status"<>'CANCELLED'`, id);
      if (Number(b.bal) < i.amount) throw new ApiError(409, 'رصيد الأمانات لا يكفي. السحب مرفوض.');
    }
    await tx.$executeRawUnsafe(`INSERT INTO "case_finance_entries" ("id","case_id","kind","amount","due_on","ref_id","note","created_by") VALUES ($1,$2,$3,$4,$5::date,$6,$7,$8)`, eid, id, i.kind, i.amount, i.dueOn ?? null, i.refId ?? null, i.note ?? null, who);
  });
  await logAuditEvent({ actorUserId: a.session.role === 'admin' ? a.session.userId : null, actorLawyerId: a.session.role === 'lawyer' ? a.session.lawyerId : null, action: 'CASE_FINANCE_ADDED', resourceType: 'case', resourceId: id, summary: i.kind + ' ' + i.amount });
  const s = summarize(await load(id));
  return json({ id: eid, budgetState: s.budgetState, budgetUsedPct: s.budgetUsedPct, trustBalance: s.trustBalance }, { status: 201 });
});
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params; const a = await gate(id); const i = await readJson(req, patch);
  const [row] = await prisma.$queryRawUnsafe<{ kind: string; status: string; amount: string; note: string | null }[]>(`SELECT "kind","status","amount"::text AS amount,"note" FROM "case_finance_entries" WHERE "id"=$1 AND "case_id"=$2`, i.id, id);
  if (!row) throw new ApiError(404, 'غير موجود');
  if (row.status !== 'OPEN') throw new ApiError(409, 'الحالة نهائية ولا تتغير');
  if (!ALLOWED[row.kind]?.includes(i.status)) throw new ApiError(400, 'تغيير حالة غير مسموح لهذا النوع');
  const who = actorTag(a.session as never); let contract: string | null = null;
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`UPDATE "case_finance_entries" SET "status"=$1,"updated_by"=$2,"updated_at"=NOW() WHERE "id"=$3`, i.status, who, i.id);
    if (row.kind === 'QUOTE' && i.status === 'ACCEPTED') { contract = 'fin_' + crypto.randomUUID().replaceAll('-', ''); await tx.$executeRawUnsafe(`INSERT INTO "case_finance_entries" ("id","case_id","kind","amount","ref_id","note","created_by") VALUES ($1,$2,'FEE_AGREEMENT',$3,$4,$5,$6)`, contract, id, row.amount, i.id, row.note, who); }
  });
  await logAuditEvent({ actorUserId: a.session.role === 'admin' ? a.session.userId : null, actorLawyerId: a.session.role === 'lawyer' ? a.session.lawyerId : null, action: 'CASE_FINANCE_STATUS', resourceType: 'case', resourceId: id, summary: row.kind + ' -> ' + i.status });
  return json({ ok: true, agreementId: contract });
});
