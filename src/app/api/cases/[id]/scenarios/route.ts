import { z } from 'zod';
import { ApiError, handle, json, readJson } from '@/lib/api';
import { can } from '@/lib/rbac';
import { officeId } from '@/lib/office-workflow';
import { requireCaseFileAccess } from '@/lib/case-file-access';
import { prisma } from '@/lib/prisma';

type Ctx = { params: Promise<{ id: string }> };

const scenarioSchema = z.object({
  title: z.string().trim().min(3, 'اكتب عنوانًا واضحًا للسيناريو').max(180),
  triggerCondition: z.string().trim().max(1500).default(''),
  possibleOutcome: z.string().trim().min(1, 'اكتب النتيجة المحتملة').max(3000),
  responsePlan: z.string().trim().max(4000).default(''),
  riskNotes: z.string().trim().max(3000).default(''),
  nextSteps: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاريخ غير صالح').nullable().optional(),
});

function canEditScenarios(access: Awaited<ReturnType<typeof requireCaseFileAccess>>) {
  return access.canRequestChanges && (access.session.role !== 'admin' || can(access.session.userRole, 'writeTasks'));
}

function actor(session: Awaited<ReturnType<typeof requireCaseFileAccess>>['session']) {
  return {
    userId: session.role === 'admin' ? session.userId : null,
    lawyerId: session.role === 'lawyer' ? session.lawyerId : null,
  };
}

export const GET = handle(async (_request: Request, context: Ctx) => {
  const { id } = await context.params;
  const access = await requireCaseFileAccess(id);
  const scenarios = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    'SELECT s."id",s."title",s."trigger_condition" AS "triggerCondition",s."possible_outcome" AS "possibleOutcome",s."response_plan" AS "responsePlan",s."risk_notes" AS "riskNotes",s."next_steps" AS "nextSteps",s."target_date"::text AS "targetDate",s."status",s."created_at" AS "createdAt",s."updated_at" AS "updatedAt",COALESCE(u."name",l."fullName") AS "createdByName" FROM "office_case_scenarios" s LEFT JOIN "users" u ON u."id"=s."created_by_user_id" LEFT JOIN "lawyers" l ON l."id"=s."created_by_lawyer_id" WHERE s."case_id"=$1 ORDER BY CASE s."status" WHEN \'SELECTED\' THEN 0 WHEN \'ACTIVE\' THEN 1 WHEN \'DRAFT\' THEN 2 ELSE 3 END,s."updated_at" DESC',
    id,
  );
  return json({ scenarios, canEdit: canEditScenarios(access) }, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
});

export const POST = handle(async (request: Request, context: Ctx) => {
  const { id } = await context.params;
  const access = await requireCaseFileAccess(id);
  if (!canEditScenarios(access)) throw new ApiError(403, 'لا تملك صلاحية إضافة سيناريو لهذه القضية');
  const data = await readJson(request, scenarioSchema);
  const existing = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
    'SELECT COUNT(*)::int AS "count" FROM "office_case_scenarios" WHERE "case_id"=$1 AND "status"<>\'ARCHIVED\'',
    id,
  );
  if ((existing[0]?.count ?? 0) >= 30) throw new ApiError(400, 'وصلت القضية إلى الحد الأقصى وهو 30 سيناريو نشطًا أو مسودة');
  const actorIds = actor(access.session);
  const scenarioId = officeId('scenario');
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      'INSERT INTO "office_case_scenarios" ("id","case_id","title","trigger_condition","possible_outcome","response_plan","risk_notes","next_steps","target_date","created_by_user_id","created_by_lawyer_id","updated_by_user_id","updated_by_lawyer_id") VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::date,$10,$11,$10,$11)',
      scenarioId, id, data.title, data.triggerCondition, data.possibleOutcome, data.responsePlan,
      data.riskNotes, JSON.stringify(data.nextSteps), data.targetDate ?? null, actorIds.userId, actorIds.lawyerId,
    );
    await tx.caseEvent.create({
      data: {
        caseId: id,
        description: 'تم إنشاء سيناريو تخطيطي جديد: ' + data.title,
        type: 'scenario',
        authorName: access.session.name,
      },
    });
  });
  return json({ ok: true, scenarioId }, { status: 201 });
});
