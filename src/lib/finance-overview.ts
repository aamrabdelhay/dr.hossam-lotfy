import 'server-only';
import { ApiError } from '@/lib/api';
import { actorOf } from '@/lib/api';
import { filterAccessibleCases } from '@/lib/case-file-access';
import { installmentAlerts, profit, summarize, type FinRow } from '@/lib/case-finance';
import { isFinanceManagement } from '@/lib/office-workflow';
import { prisma } from '@/lib/prisma';
type CaseRef = { id: string; number: string; branch_id: string | null; client_id: string | null };
/** Finance rows for the cases this person may see (case wall applied). Finance management and senior only. */
export async function visibleFinance() {
  const s = await actorOf(); if (!(await isFinanceManagement(s))) throw new ApiError(403, 'للإدارة المالية والعليا فقط');
  const all = await prisma.$queryRawUnsafe<CaseRef[]>(`SELECT DISTINCT c."id", c."number", COALESCE(c."branch_id",'branch_main') AS branch_id, c."clientId" AS client_id FROM "case_records" c JOIN "case_finance_entries" f ON f."case_id"=c."id"`);
  const ok = new Set((await filterAccessibleCases(s, all)).map((x) => x.id)); const cases = all.filter((x) => ok.has(x.id));
  const rows = cases.length ? await prisma.$queryRawUnsafe<FinRow[]>(`SELECT "id","case_id","kind","amount"::text AS amount,"currency",to_char("due_on",'YYYY-MM-DD') AS due_on,"status","ref_id","note","created_at"::text AS created_at FROM "case_finance_entries" WHERE "case_id"=ANY($1::text[]) ORDER BY "created_at","id" LIMIT 20000`, cases.map((x) => x.id)) : [];
  return { cases, rows };
}
export function overview(cases: CaseRef[], rows: FinRow[], today: string) {
  const by = new Map<string, FinRow[]>(); for (const r of rows) (by.get(r.case_id) ?? by.set(r.case_id, []).get(r.case_id)!).push(r);
  const perCase = cases.map((c) => { const rs = by.get(c.id) ?? []; return { caseId: c.id, number: c.number, branchId: c.branch_id, clientId: c.client_id, summary: summarize(rs), profit: profit(rs), installments: installmentAlerts(rs, today) }; });
  const group = (key: 'branchId' | 'clientId') => { const m = new Map<string, { received: number; expenses: number; net: number; cases: number }>(); for (const p of perCase) { const k = p[key] ?? '-'; const g = m.get(k) ?? { received: 0, expenses: 0, net: 0, cases: 0 }; g.received += p.profit.received; g.expenses += p.profit.expensesNotReimbursed; g.net += p.profit.net; g.cases++; m.set(k, g); } return Object.fromEntries(m); };
  return { perCase, perBranch: group('branchId'), perClient: group('clientId'), alerts: { budget: perCase.filter((p) => p.summary.budgetState === 'NEAR' || p.summary.budgetState === 'EXCEEDED').map((p) => ({ caseId: p.caseId, number: p.number, state: p.summary.budgetState, usedPct: p.summary.budgetUsedPct })), overdueInstallments: perCase.filter((p) => p.installments.overdue.length).map((p) => ({ caseId: p.caseId, number: p.number, count: p.installments.overdue.length })) }, notes: ['الربحية = المدفوع ناقص المصروفات غير المستردة. تكلفة الوقت غير محسوبة لأن سعر الساعة غير مسجل.', 'التحليل حسب المحامي غير متاح: لا يوجد ربط مسجل بين الأتعاب والمحامي.'] };
}
