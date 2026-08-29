import { prisma } from '@/lib/prisma';
import { handle, json, user } from '@/lib/api';
import { can } from '@/lib/rbac';
import { logActivity } from '@/lib/activity';
import { notifyTaskCompleted } from '@/lib/notifications';

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const session = await user();
  if (!session) return json({ error: 'يجب تسجيل الدخول لإتمام هذا الإجراء' }, { status: 401 });

  const task = await prisma.task.findUnique({ where: { id }, include: { assignees: { include: { lawyer: true } }, location: true, author: true } });
  if (!task) return json({ error: 'المهمة غير موجودة' }, { status: 404 });
  if (task.status === 'CANCELLED') return json({ error: 'المهمة ملغاة' }, { status: 409 });

  const now = new Date();

  // الإدارة لا تُنهي المهمة مباشرة نيابةً عن المحامي؛ بل ترسل طلب موافقة.
  if (session.role === 'admin') {
    if (!can(session.userRole, 'writeTasks')) return json({ error: 'لا تملك صلاحية تسجيل تنفيذ المهمة' }, { status: 403 });
    if (task.status === 'COMPLETED') return json({ error: 'هذه المهمة مسجلة كمكتملة بالفعل' }, { status: 409 });

    const remaining = task.assignees.filter((a) => !a.completedAt);
    if (remaining.length === 0) return json({ error: 'لا توجد إسنادات معلقة لهذه المهمة' }, { status: 409 });

    for (const assignment of remaining) {
      const existing = await prisma.notification.findFirst({ where: { lawyerId: assignment.lawyerId, type: 'TASK_COMPLETION_REQUEST', link: `/sessions/${id}`, readAt: null } });
      if (!existing) {
        await prisma.notification.create({ data: { lawyerId: assignment.lawyerId, type: 'TASK_COMPLETION_REQUEST', title: 'طلب إنهاء تكليف نيابةً عنك', body: `الإدارة تطلب تسجيل تنفيذ التكليف: ${task.description.slice(0, 120)}`, link: `/sessions/${id}` } });
      }
    }
    await logActivity({ action: 'COMPLETION_REQUESTED', summary: `طلبت الإدارة موافقة المحامين على إنهاء التكليف: ${task.description.slice(0, 70)}`, taskId: id, locationId: task.locationId, byUserId: session.userId });
    return json({ ok: true, requested: true });
  }

  if (session.role !== 'lawyer') return json({ error: 'لا يمكنك تنفيذ هذه المهمة' }, { status: 403 });
  const mine = task.assignees.find((a) => a.lawyerId === session.lawyerId);
  if (!mine) return json({ error: 'لا يمكنك تنفيذ مهمة غير مسندة إليك' }, { status: 403 });
  if (mine.completedAt) return json({ error: 'هذه المهمة مسجلة كمكتملة بالفعل' }, { status: 409 });

  await prisma.taskAssignment.update({ where: { id: mine.id }, data: { completedAt: now, completedById: session.lawyerId } });
  const remaining = await prisma.taskAssignment.count({ where: { taskId: id, completedAt: null } });
  if (remaining === 0) await prisma.task.update({ where: { id }, data: { status: 'COMPLETED', completedAt: now } });
  else await prisma.task.update({ where: { id }, data: { status: 'IN_PROGRESS' } });

  await logActivity({ action: 'COMPLETED', summary: `أنجز مهمة: ${task.description.slice(0, 70)}`, taskId: id, lawyerId: session.lawyerId, locationId: task.locationId, byLawyerId: session.lawyerId });
  await notifyTaskCompleted(id, session.name, task.description.slice(0, 70), task.location.name);
  return json({ ok: true, completed: remaining === 0 });
});
