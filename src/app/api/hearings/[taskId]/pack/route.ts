import { ApiError, handle, json, actorOf } from '@/lib/api';
import { requireCaseFileAccess } from '@/lib/case-file-access';
import { canActOnTask } from '@/lib/hearings';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ taskId: string }> };
/** Hearing pack (item 99): session details + case basics + open register items + file names + earlier outcomes. File names only, no file bytes. Walls apply. */
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { taskId } = await ctx.params; const s = await actorOf();
  const c = await canActOnTask(s, taskId); if (!c) throw new ApiError(404, 'الجلسة غير موجودة'); if (!c.allowed) throw new ApiError(403, 'لا تملك صلاحية هذه الجلسة');
  const t = await prisma.task.findUnique({ where: { id: taskId }, select: { description: true, notes: true, scheduledDate: true, scheduledTime: true, location: { select: { name: true, address: true } } } });
  const outcomes = await prisma.$queryRawUnsafe<any[]>(`SELECT "outcome_code","result","feedback","updated_at" FROM "task_feedback" WHERE "task_id"=$1 LIMIT 1`, taskId);
  let caseInfo: unknown = null, register: any[] = [];
  if (c.task.caseId) {
    await requireCaseFileAccess(c.task.caseId);
    caseInfo = await prisma.caseRecord.findUnique({ where: { id: c.task.caseId }, select: { id: true, name: true, number: true } });
    register = await prisma.$queryRawUnsafe<any[]>(`SELECT "kind","title","status","due_date" FROM "office_case_register" WHERE "case_id"=$1 AND "status"='OPEN' AND "kind" IN ('POA','CHECKLIST','EXPERT_MISSION','ENFORCEMENT') ORDER BY "created_at" DESC LIMIT 100`, c.task.caseId);
  }
  await logAuditEvent({ actorUserId: s.role === 'admin' ? s.userId : null, actorLawyerId: s.role === 'lawyer' ? s.lawyerId : null, action: 'SESSION_PACK_VIEW', resourceType: 'task', resourceId: taskId, summary: 'Hearing pack opened', metadata: {} });
  return json({ session: t, case: caseInfo, openRegisterItems: register, previousOutcomes: outcomes, note: 'ملف مرجعي للتحضير: بيانات الجلسة والقضية وبنود السجل المفتوحة. بدون ملفات.' });
});
