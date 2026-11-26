import { ApiError, actorOf, handle, json } from '@/lib/api';
import { isSeniorManagement } from '@/lib/office-workflow';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
const date = /^\d{4}-\d{2}-\d{2}$/;
/** Absence coverage checklist (item 172). Senior management only. Lists what the absent lawyer still has open in the window. It changes nothing and assigns nothing: a person picks the substitute and reassigns. */
export const GET = handle(async (req: Request) => {
  const s = await actorOf(); if (!(await isSeniorManagement(s))) throw new ApiError(403, 'تغطية الغياب للإدارة العليا فقط');
  const sp = new URL(req.url).searchParams; const lawyerId = sp.get('lawyerId') ?? ''; const from = sp.get('from') ?? ''; const to = sp.get('to') ?? '';
  if (!lawyerId || !date.test(from) || !date.test(to) || to < from) throw new ApiError(400, 'حدد المحامي وفترة صحيحة');
  const tasks = await prisma.$queryRawUnsafe<{ id: string; description: string; d: string | null; t: string | null; case_number: string | null; other_assignees: number }[]>(
    `SELECT t."id", t."description", to_char(t."scheduledDate",'YYYY-MM-DD') AS d, t."scheduledTime" AS t, c."number" AS case_number,
            (SELECT count(*)::int FROM "task_assignments" a2 WHERE a2."taskId"=t."id" AND a2."lawyerId"<>$1) AS other_assignees
       FROM "task_assignments" a JOIN "tasks" t ON t."id"=a."taskId" LEFT JOIN "case_records" c ON c."id"=t."caseId"
      WHERE a."lawyerId"=$1 AND a."completedAt" IS NULL AND t."status" IN ('PENDING','IN_PROGRESS') AND t."scheduledDate" BETWEEN $2::date AND $3::date
      ORDER BY t."scheduledDate", t."scheduledTime" NULLS LAST LIMIT 300`, lawyerId, from, to);
  return json({ lawyerId, from, to, items: tasks.map((x) => ({ ...x, needsSubstitute: x.other_assignees === 0 })), notice: 'قائمة متابعة فقط. اختيار البديل وإعادة التوزيع قرار الإدارة.' });
});
