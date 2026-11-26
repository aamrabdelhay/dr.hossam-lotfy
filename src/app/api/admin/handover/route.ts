import { ApiError, actorOf, handle, json } from '@/lib/api';
import { isSeniorManagement } from '@/lib/office-workflow';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
/** Knowledge hand-over checklist when a lawyer leaves or moves (item 163). Senior management only, read only. Lists what is still tied to the lawyer so a person can reassign it and record the transfer in the office log (kind HANDOVER). It moves nothing and decides nothing. */
export const GET = handle(async (req: Request) => {
  const s = await actorOf(); if (!(await isSeniorManagement(s))) throw new ApiError(403, 'قائمة التسليم للإدارة العليا فقط');
  const lawyerId = new URL(req.url).searchParams.get('lawyerId') ?? ''; if (!lawyerId) throw new ApiError(400, 'حدد المحامي');
  const [l] = await prisma.$queryRawUnsafe<{ fullName: string }[]>(`SELECT "fullName" FROM "lawyers" WHERE "id"=$1`, lawyerId); if (!l) throw new ApiError(404, 'المحامي غير موجود');
  const [tasks, cases, register, files, deadlines] = await Promise.all([
    prisma.$queryRawUnsafe<{ id: string; description: string; d: string | null; case_number: string | null }[]>(`SELECT t."id", t."description", to_char(t."scheduledDate",'YYYY-MM-DD') AS d, c."number" AS case_number FROM "task_assignments" a JOIN "tasks" t ON t."id"=a."taskId" LEFT JOIN "case_records" c ON c."id"=t."caseId" WHERE a."lawyerId"=$1 AND a."completedAt" IS NULL AND t."status" IN ('PENDING','IN_PROGRESS') ORDER BY t."scheduledDate" NULLS LAST LIMIT 300`, lawyerId),
    prisma.$queryRawUnsafe<{ id: string; number: string; name: string }[]>(`SELECT DISTINCT c."id", c."number", c."name" FROM "task_assignments" a JOIN "tasks" t ON t."id"=a."taskId" JOIN "case_records" c ON c."id"=t."caseId" WHERE a."lawyerId"=$1 AND c."archived_at" IS NULL LIMIT 300`, lawyerId),
    prisma.$queryRawUnsafe<{ id: string; kind: string; title: string; case_id: string }[]>(`SELECT "id","kind","title","case_id" FROM "office_case_register" WHERE "created_by"=$1 AND "status"='OPEN' ORDER BY "created_at" DESC LIMIT 300`, 'lawyer:' + lawyerId),
    prisma.$queryRawUnsafe<{ n: number }[]>(`SELECT count(*)::int AS n FROM "case_files" WHERE "created_by_lawyer_id"=$1 AND "deleted_at" IS NULL`, lawyerId),
    prisma.$queryRawUnsafe<{ id: string; due: string; case_id: string }[]>(`SELECT "id", to_char("due_date",'YYYY-MM-DD') AS due, "case_id" FROM "office_case_deadlines" WHERE "created_by"=$1 AND "status"='OPEN' LIMIT 300`, 'lawyer:' + lawyerId).catch(() => []),
  ]);
  return json({ lawyerId, name: l.fullName, openTasks: tasks, cases, openRegisterItems: register, filesUploaded: files[0].n, openDeadlinesCreated: deadlines, notice: 'قائمة متابعة فقط. إعادة التوزيع وتسجيل التسليم قرار الإدارة (سجل المكتب: تسليم واستلام).' });
});
