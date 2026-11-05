import { z } from 'zod';
import { ApiError, handle, json, readJson } from '@/lib/api';
import { can } from '@/lib/rbac';
import { requireCaseFileAccess } from '@/lib/case-file-access';
import { prisma } from '@/lib/prisma';

type Ctx = { params: Promise<{ id: string; scenarioId: string }> };
const updateSchema = z.object({
  title: z.string().trim().min(3).max(180).optional(),
  triggerCondition: z.string().trim().max(1500).optional(),
  possibleOutcome: z.string().trim().min(1).max(3000).optional(),
  responsePlan: z.string().trim().max(4000).optional(),
  riskNotes: z.string().trim().max(3000).optional(),
  nextSteps: z.array(z.string().trim().min(1).max(300)).max(20).optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status: z.enum(['DRAFT','ACTIVE','SELECTED','ARCHIVED']).optional(),
});

export const PATCH = handle(async (request: Request, context: Ctx) => {
  const { id, scenarioId } = await context.params;
  const access = await requireCaseFileAccess(id);
  if (!access.canRequestChanges || (access.session.role === 'admin' && !can(access.session.userRole, 'writeTasks'))) {
    throw new ApiError(403, 'لا تملك صلاحية تعديل سيناريوهات هذه القضية');
  }
  const data = await readJson(request, updateSchema);
  if (!Object.keys(data).length) throw new ApiError(400, 'لا توجد تغييرات لحفظها');

  const currentRows = await prisma.$queryRawUnsafe<Array<{
    id: string; title: string; triggerCondition: string; possibleOutcome: string;
    responsePlan: string; riskNotes: string; nextSteps: unknown; targetDate: string | null; status: string;
  }>>(
    'SELECT "id","title","trigger_condition" AS "triggerCondition","possible_outcome" AS "possibleOutcome","response_plan" AS "responsePlan","risk_notes" AS "riskNotes","next_steps" AS "nextSteps","target_date"::text AS "targetDate","status" FROM "office_case_scenarios" WHERE "id"=$1 AND "case_id"=$2 LIMIT 1',
    scenarioId, id,
  );
  const current = currentRows[0];
  if (!current) throw new ApiError(404, 'السيناريو غير موجود في هذه القضية');

  const title = data.title ?? current.title;
  const triggerCondition = data.triggerCondition ?? current.triggerCondition;
  const possibleOutcome = data.possibleOutcome ?? current.possibleOutcome;
  const responsePlan = data.responsePlan ?? current.responsePlan;
  const riskNotes = data.riskNotes ?? current.riskNotes;
  const nextSteps = data.nextSteps ?? (Array.isArray(current.nextSteps) ? current.nextSteps : []);
  const targetDate = data.targetDate === undefined ? current.targetDate : data.targetDate;
  const status = data.status ?? current.status;
  const actorUserId = access.session.role === 'admin' ? access.session.userId : null;
  const actorLawyerId = access.session.role === 'lawyer' ? access.session.lawyerId : null;

  await prisma.$transaction(async (tx) => {
    if (status === 'SELECTED') {
      await tx.$executeRawUnsafe(
        'UPDATE "office_case_scenarios" SET "status"=\'ACTIVE\',"updated_at"=NOW() WHERE "case_id"=$1 AND "status"=\'SELECTED\' AND "id"<>$2',
        id, scenarioId,
      );
    }
    await tx.$executeRawUnsafe(
      'UPDATE "office_case_scenarios" SET "title"=$3,"trigger_condition"=$4,"possible_outcome"=$5,"response_plan"=$6,"risk_notes"=$7,"next_steps"=$8::jsonb,"target_date"=$9::date,"status"=$10,"updated_by_user_id"=$11,"updated_by_lawyer_id"=$12,"updated_at"=NOW() WHERE "id"=$1 AND "case_id"=$2',
      scenarioId, id, title, triggerCondition, possibleOutcome, responsePlan, riskNotes,
      JSON.stringify(nextSteps), targetDate, status, actorUserId, actorLawyerId,
    );
    await tx.caseEvent.create({
      data: {
        caseId: id,
        description: status === 'SELECTED'
          ? 'تم اختيار السيناريو كخطة العمل الحالية: ' + title
          : status === 'ARCHIVED'
            ? 'تمت أرشفة السيناريو: ' + title
            : 'تم تحديث السيناريو التخطيطي: ' + title,
        type: 'scenario',
        authorName: access.session.name,
      },
    });
  });
  return json({ ok: true, status });
});
