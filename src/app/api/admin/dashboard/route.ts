import { ApiError, actorOf, handle, json } from '@/lib/api';
import { isFinanceManagement, isSeniorManagement } from '@/lib/office-workflow';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
const WALLED = `NOT EXISTS (SELECT 1 FROM "office_case_security" s WHERE s."case_id"=c."id" AND (s."ethical_wall_enabled" OR s."classification" IN ('CONFIDENTIAL','HIGHLY_CONFIDENTIAL')))`;
const one = async (sql: string) => Number((await prisma.$queryRawUnsafe<{ n: number }[]>(sql))[0]?.n ?? 0);
/** Senior dashboard counts (item 211). Senior management only. Counts exclude walled or confidential cases, so the totals are "visible-class cases only" and say so. Finance counts need finance management. Numbers only, no case names. */
export const GET = handle(async () => {
  const s = await actorOf(); if (!(await isSeniorManagement(s))) throw new ApiError(403, 'للإدارة العليا فقط');
  const out: Record<string, number | null> = {
    cases: await one(`SELECT count(*)::int n FROM "case_records" c WHERE ${WALLED}`),
    tasksPending: await one(`SELECT count(*)::int n FROM "tasks" t JOIN "case_records" c ON c."id"=t."caseId" WHERE t."status" IN ('PENDING','IN_PROGRESS') AND ${WALLED}`),
    deadlinesOverdue: await one(`SELECT count(*)::int n FROM "office_case_deadlines" d JOIN "case_records" c ON c."id"=d."case_id" WHERE d."status"='OPEN' AND d."due_date"<CURRENT_DATE AND ${WALLED}`),
    deadlinesNext7Days: await one(`SELECT count(*)::int n FROM "office_case_deadlines" d JOIN "case_records" c ON c."id"=d."case_id" WHERE d."status"='OPEN' AND d."due_date" BETWEEN CURRENT_DATE AND CURRENT_DATE+7 AND ${WALLED}`),
    filesInReview: await one(`SELECT count(*)::int n FROM "case_files" f JOIN "case_records" c ON c."id"=f."case_id" WHERE f."deleted_at" IS NULL AND f."review_status"='IN_REVIEW' AND ${WALLED}`),
    installmentsOverdue: null, openInvoices: null,
  };
  if (await isFinanceManagement(s)) {
    out.installmentsOverdue = await one(`SELECT count(*)::int n FROM "case_finance_entries" f JOIN "case_records" c ON c."id"=f."case_id" WHERE f."kind"='INSTALLMENT' AND f."status"='OPEN' AND f."due_on"<CURRENT_DATE AND ${WALLED}`);
    out.openInvoices = await one(`SELECT count(*)::int n FROM "case_finance_entries" f JOIN "case_records" c ON c."id"=f."case_id" WHERE f."kind"='INVOICE' AND f."status"='OPEN' AND ${WALLED}`);
  }
  return json({ counts: out, scope: 'القضايا العادية فقط، المحجوبة أو السرية غير محسوبة. أرقام فقط.' });
});
