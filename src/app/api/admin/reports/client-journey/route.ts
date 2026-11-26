import { ApiError, actorOf, handle, json } from '@/lib/api';
import { isSeniorManagement } from '@/lib/office-workflow';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
const one = async (sql: string) => Number((await prisma.$queryRawUnsafe<{ n: number }[]>(sql))[0]?.n ?? 0);
/** Client journey funnel (item 216), from data the system really holds: appointment requests (first contact) -> confirmed -> client has a case. Counts only, senior management only. There is NO lead-source or loss-reason field in the system, so loss by source/reason is not reported and not guessed: "not confirmed" is the only drop-off the data supports. */
export const GET = handle(async () => {
  const s = await actorOf(); if (!(await isSeniorManagement(s))) throw new ApiError(403, 'للإدارة العليا فقط');
  const byStatus = await prisma.$queryRawUnsafe<{ status: string; n: number }[]>(`SELECT "status", count(*)::int n FROM "client_appointments" GROUP BY 1 ORDER BY 1`);
  const requests = await one(`SELECT count(DISTINCT "client_id")::int n FROM "client_appointments"`);
  const confirmed = await one(`SELECT count(DISTINCT "client_id")::int n FROM "client_appointments" WHERE "status"='CONFIRMED'`);
  const withCase = await one(`SELECT count(DISTINCT a."client_id")::int n FROM "client_appointments" a WHERE EXISTS (SELECT 1 FROM "case_records" c WHERE c."clientId"=a."client_id")`);
  return json({ stages: { requested: requests, confirmed, hasCase: withCase }, appointmentsByStatus: byStatus, notConfirmed: requests - confirmed, limits: 'لا يوجد في النظام حقل لمصدر العميل أو سبب فقدانه، لذلك لا يتم تقدير ذلك. المتاح: عدد العملاء في كل مرحلة فقط.' });
});
