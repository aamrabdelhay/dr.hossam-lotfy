import 'server-only';
import { monthsBetween, withDeltas, type Cell } from '@/lib/period-report-core';
import { prisma } from '@/lib/prisma';
const WALLED = `NOT EXISTS (SELECT 1 FROM "office_case_security" s WHERE s."case_id"=c."id" AND (s."ethical_wall_enabled" OR s."classification" IN ('CONFIDENTIAL','HIGHLY_CONFIDENTIAL')))`;
/** Counts per month and branch (items 212, 213). Walled and confidential cases are left out. Finance columns only when includeFinance. Counts only, no names. */
export async function periodReport(from: string, to: string, includeFinance: boolean) {
  const months = monthsBetween(from, to); const start = months[0] + '-01'; const [ty, tm] = to.split('-').map(Number); const end = new Date(Date.UTC(ty, tm, 1)).toISOString().slice(0, 10);
  type R = { month: string; branch: string; n: string };
  const q = (sql: string) => prisma.$queryRawUnsafe<R[]>(sql, start, end);
  const [created, completed, files, inv, pay] = await Promise.all([
    q(`SELECT to_char(t."createdAt",'YYYY-MM') AS month, COALESCE(c."branch_id",'-') AS branch, count(*)::text AS n FROM "tasks" t LEFT JOIN "case_records" c ON c."id"=t."caseId" WHERE t."createdAt" >= $1::date AND t."createdAt" < $2::date AND (c."id" IS NULL OR ${WALLED}) GROUP BY 1,2`),
    q(`SELECT to_char(t."completedAt",'YYYY-MM') AS month, COALESCE(c."branch_id",'-') AS branch, count(*)::text AS n FROM "tasks" t LEFT JOIN "case_records" c ON c."id"=t."caseId" WHERE t."completedAt" >= $1::date AND t."completedAt" < $2::date AND (c."id" IS NULL OR ${WALLED}) GROUP BY 1,2`),
    q(`SELECT to_char(f."created_at",'YYYY-MM') AS month, COALESCE(c."branch_id",'-') AS branch, count(*)::text AS n FROM "case_files" f JOIN "case_records" c ON c."id"=f."case_id" WHERE f."deleted_at" IS NULL AND f."created_at" >= $1::date AND f."created_at" < $2::date AND ${WALLED} GROUP BY 1,2`),
    includeFinance ? q(`SELECT to_char(f."created_at",'YYYY-MM') AS month, COALESCE(c."branch_id",'-') AS branch, SUM(f."amount")::text AS n FROM "case_finance_entries" f JOIN "case_records" c ON c."id"=f."case_id" WHERE f."kind"='INVOICE' AND f."status"<>'CANCELLED' AND f."created_at" >= $1::date AND f."created_at" < $2::date AND ${WALLED} GROUP BY 1,2`) : Promise.resolve([] as R[]),
    includeFinance ? q(`SELECT to_char(f."created_at",'YYYY-MM') AS month, COALESCE(c."branch_id",'-') AS branch, SUM(f."amount")::text AS n FROM "case_finance_entries" f JOIN "case_records" c ON c."id"=f."case_id" WHERE f."kind"='PAYMENT' AND f."status"<>'CANCELLED' AND f."created_at" >= $1::date AND f."created_at" < $2::date AND ${WALLED} GROUP BY 1,2`) : Promise.resolve([] as R[]),
  ]);
  const cells = new Map<string, Cell>(); const get = (m: string, b: string) => { const k = m + '|' + b; return cells.get(k) ?? (cells.set(k, { month: m, branch: b, tasksCreated: 0, tasksCompleted: 0, filesUploaded: 0, invoiced: includeFinance ? 0 : null, received: includeFinance ? 0 : null }), cells.get(k)!); };
  for (const r of created) get(r.month, r.branch).tasksCreated = Number(r.n); for (const r of completed) get(r.month, r.branch).tasksCompleted = Number(r.n); for (const r of files) get(r.month, r.branch).filesUploaded = Number(r.n);
  for (const r of inv) get(r.month, r.branch).invoiced = Number(r.n); for (const r of pay) get(r.month, r.branch).received = Number(r.n);
  return { months, rows: withDeltas([...cells.values()]), notes: ['أرقام تجميعية فقط. القضايا المحمية بحاجز أخلاقي أو السرية غير محسوبة.', 'لا يوجد تاريخ فتح للقضية في البيانات، لذلك لا يوجد عدد قضايا جديدة.'] };
}
