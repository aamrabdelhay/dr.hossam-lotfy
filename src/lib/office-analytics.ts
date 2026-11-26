import 'server-only';
import { prisma } from '@/lib/prisma';
import { simulate } from '@/lib/office-analytics-core';

/** Items 166/167/168/169/171/172/189: office analytics from data already stored. Counts only (no names of cases). Read only. */
export async function analytics(opts: { capacity: number; extra: number; staleDays: number }) {
  const lawyers = await prisma.$queryRawUnsafe<{ id: string; name: string; open: number; overdue: number; next30: number; done30: number }[]>(
    `SELECT l."id", l."fullName" AS name,
       count(*) FILTER (WHERE a."id" IS NOT NULL AND a."completedAt" IS NULL AND t."status" IN ('PENDING','IN_PROGRESS'))::int AS open,
       count(*) FILTER (WHERE a."id" IS NOT NULL AND a."completedAt" IS NULL AND t."status" IN ('PENDING','IN_PROGRESS') AND t."scheduledDate" < CURRENT_DATE)::int AS overdue,
       count(*) FILTER (WHERE a."id" IS NOT NULL AND a."completedAt" IS NULL AND t."status" IN ('PENDING','IN_PROGRESS') AND t."scheduledDate" BETWEEN CURRENT_DATE AND CURRENT_DATE + 30)::int AS next30,
       count(*) FILTER (WHERE a."completedAt" >= NOW() - interval '30 days')::int AS done30
     FROM "lawyers" l LEFT JOIN "task_assignments" a ON a."lawyerId"=l."id" LEFT JOIN "tasks" t ON t."id"=a."taskId"
     WHERE l."active" GROUP BY l."id", l."fullName" ORDER BY open DESC, name LIMIT 500`);
  const byStatus = await prisma.$queryRawUnsafe<{ status: string; cases: number; stale: number }[]>(
    `SELECT c."workflow_status" AS status, count(*)::int AS cases,
       count(*) FILTER (WHERE GREATEST(COALESCE((SELECT max(e."createdAt") FROM "case_events" e WHERE e."caseId"=c."id"),'epoch'), COALESCE((SELECT max(t."updatedAt") FROM "tasks" t WHERE t."caseId"=c."id"),'epoch')) < NOW() - ($1::int * interval '1 day'))::int AS stale
     FROM "case_records" c WHERE c."archived_at" IS NULL GROUP BY c."workflow_status" ORDER BY cases DESC`, opts.staleDays);
  const [h] = await prisma.$queryRawUnsafe<{ open_cases: number; overdue_tasks: number; open_deadlines: number; overdue_deadlines: number; open_register: number }[]>(
    `SELECT (SELECT count(*)::int FROM "case_records" WHERE "archived_at" IS NULL) AS open_cases,
            (SELECT count(*)::int FROM "tasks" WHERE "status" IN ('PENDING','IN_PROGRESS') AND "scheduledDate" < CURRENT_DATE) AS overdue_tasks,
            (SELECT count(*)::int FROM "office_case_deadlines" WHERE "status"='OPEN') AS open_deadlines,
            (SELECT count(*)::int FROM "office_case_deadlines" WHERE "status"='OPEN' AND "due_date" < CURRENT_DATE) AS overdue_deadlines,
            (SELECT count(*)::int FROM "office_case_register" WHERE "status"='OPEN') AS open_register`).catch(() => [{ open_cases: 0, overdue_tasks: 0, open_deadlines: 0, overdue_deadlines: 0, open_register: 0 }]);
  const branches = await prisma.$queryRawUnsafe<{ id: string; name: string; cases: number; overdue_tasks: number; open_register: number }[]>(
    `SELECT b."id", b."name_ar" AS name,
       (SELECT count(*)::int FROM "case_records" c WHERE c."branch_id"=b."id" AND c."archived_at" IS NULL) AS cases,
       (SELECT count(*)::int FROM "tasks" t JOIN "case_records" c ON c."id"=t."caseId" WHERE c."branch_id"=b."id" AND t."status" IN ('PENDING','IN_PROGRESS') AND t."scheduledDate" < CURRENT_DATE) AS overdue_tasks,
       (SELECT count(*)::int FROM "office_case_register" r JOIN "case_records" c ON c."id"=r."case_id" WHERE c."branch_id"=b."id" AND r."status"='OPEN') AS open_register
     FROM "office_branches" b WHERE b."active" ORDER BY b."is_main" DESC, b."name_ar"`).catch(() => []);
  const cap = opts.capacity;
  return {
    capacity: cap,
    workload: lawyers.map((l) => ({ ...l, loadPercent: Math.round((l.open / cap) * 100), overCapacity: l.open > cap })),
    bottlenecks: { staleDays: opts.staleDays, byStatus, overdueTasks: h.overdue_tasks, overdueDeadlines: h.overdue_deadlines },
    health: h,
    branches,
    simulation: opts.extra > 0 ? { extraTasks: opts.extra, result: simulate(lawyers.map((l) => ({ id: l.id, open: l.open })), opts.extra, cap) } : null,
    notice: 'أرقام من البيانات المسجلة فقط. الطاقة الاستيعابية رقم تحدده الإدارة. المحاكاة حساب بسيط ولا تعرف التخصص أو الإجازات.',
  };
}
