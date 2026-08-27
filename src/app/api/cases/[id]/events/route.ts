import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handle, json, readJson, user } from '@/lib/api';
import { can } from '@/lib/rbac';
import { logActivity } from '@/lib/activity';

type Ctx = { params: Promise<{ id: string }> };

const eventSchema = z.object({
  description: z.string().min(1, 'وصف الحدث مطلوب').max(1000),
  type: z.string().max(60).optional(),
});

/**
 * Append an event to a case's history timeline. Admins (with writeTasks) can
 * add events freely; a lawyer may only add events to a case they are involved
 * in (i.e. they are assigned to at least one of the case's tasks).
 */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const session = await user();
  if (!session) return json({ error: 'يجب تسجيل الدخول لإضافة حدث للقضية' }, { status: 401 });

  const caseRecord = await prisma.caseRecord.findUnique({
    where: { id },
    include: { tasks: { select: { assignees: { select: { lawyerId: true } } } } },
  });
  if (!caseRecord) return json({ error: 'القضية غير موجودة' }, { status: 404 });

  const isAdmin = session.role === 'admin';
  if (isAdmin && !can(session.userRole, 'writeTasks')) {
    return json({ error: 'لا تملك صلاحية تعديل القضايا' }, { status: 403 });
  }
  if (!isAdmin) {
    const involved = caseRecord.tasks.some((t) => t.assignees.some((a) => a.lawyerId === session.lawyerId));
    if (!involved) return json({ error: 'هذه القضية ليست ضمن مهامك' }, { status: 403 });
  }

  const data = await readJson(req as never, eventSchema);
  const event = await prisma.caseEvent.create({
    data: {
      caseId: id,
      description: data.description.trim(),
      type: data.type?.trim() || 'note',
      authorName: session.name,
    },
  });

  await logActivity({
    action: 'CASE_EVENT',
    summary: `أضاف حدثاً لقضية (${caseRecord.name}): ${data.description.slice(0, 60)}`,
    byUserId: isAdmin ? session.userId : null,
    byLawyerId: isAdmin ? null : session.lawyerId,
  });

  return json({ ok: true, event }, { status: 201 });
});

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const session = await user();
  if (!session) return json({ error: 'يجب تسجيل الدخول لعرض سجل القضية' }, { status: 401 });
  const caseRecord = await prisma.caseRecord.findUnique({ where: { id } });
  if (!caseRecord) return json({ error: 'القضية غير موجودة' }, { status: 404 });
  const events = await prisma.caseEvent.findMany({
    where: { caseId: id },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return json({ case: caseRecord, events });
});
