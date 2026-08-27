import { prisma } from '@/lib/prisma';
import { handle, json, user } from '@/lib/api';
import { can } from '@/lib/rbac';
import { logActivity } from '@/lib/activity';
import { notifyTaskCompleted } from '@/lib/notifications';

type Ctx = { params: Promise<{ id: string }> };

/**
 * «إنهاء» (تسجيل التنفيذ) — متاح:
 *  • للمحامي المكلّف بهذه المهمة، ولو قبل موعدها (تنفيذ مبكر)،
 *  • للأدمن بصلاحية writeTasks — يغلق المهمة نيابةً عن المحامي (كل
 *    الإسنادات المتبقية تُسجَّل مكتملة).
 * لا يمكن لمحامٍ تسجيل تنفيذ مهمة غير مسندة إليه (server-enforced).
 */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const session = await user();
  if (!session) return json({ error: 'يجب تسجيل الدخول لإتمام هذا الإجراء' }, { status: 401 });

  const task = await prisma.task.findUnique({
    where: { id },
    include: { assignees: { include: { lawyer: true } }, location: true, author: true },
  });
  if (!task) return json({ error: 'المهمة غير موجودة' }, { status: 404 });
  if (task.status === 'CANCELLED') return json({ error: 'المهمة ملغاة' }, { status: 409 });

  const now = new Date();

  // ── أدمن بصلاحية writeTasks: إغلاق نيابةً عن المحامي ──
  if (session.role === 'admin') {
    if (!can(session.userRole, 'writeTasks')) {
      return json({ error: 'لا تملك صلاحية تسجيل تنفيذ المهمة' }, { status: 403 });
    }
    if (task.status === 'COMPLETED') return json({ error: 'هذه المهمة مسجلة كمكتملة بالفعل' }, { status: 409 });

    const remaining = await prisma.taskAssignment.findMany({ where: { taskId: id, completedAt: null } });
    if (remaining.length > 0) {
      await prisma.taskAssignment.updateMany({
        where: { taskId: id, completedAt: null },
        data: { completedAt: now },
      });
    }
    await prisma.task.update({ where: { id }, data: { status: 'COMPLETED', completedAt: now } });

    await logActivity({
      action: 'COMPLETED',
      summary: `أغلق المهمة نيابةً عن المحامين: ${task.description.slice(0, 70)}`,
      taskId: id,
      locationId: task.locationId,
      byUserId: session.userId,
    });
    await notifyTaskCompleted(id, `الإدارة (${session.name})`, task.description.slice(0, 70), task.location.name);

    return json({ ok: true, completed: true, byAdmin: true });
  }

  // ── مسار المحامي المكلّف ──
  if (session.role !== 'lawyer') {
    return json({ error: 'لا يمكنك تنفيذ هذه المهمة' }, { status: 403 });
  }
  const mine = task.assignees.find((a) => a.lawyerId === session.lawyerId);
  if (!mine) {
    return json({ error: 'لا يمكنك تنفيذ مهمة غير مسندة إليك' }, { status: 403 });
  }
  if (mine.completedAt) return json({ error: 'هذه المهمة مسجلة كمكتملة بالفعل' }, { status: 409 });

  await prisma.taskAssignment.update({
    where: { id: mine.id },
    data: { completedAt: now, completedById: session.lawyerId },
  });

  // task is complete when every assignment is complete
  const remaining = await prisma.taskAssignment.count({ where: { taskId: id, completedAt: null } });
  if (remaining === 0) {
    await prisma.task.update({ where: { id }, data: { status: 'COMPLETED', completedAt: now } });
  } else {
    await prisma.task.update({ where: { id }, data: { status: 'IN_PROGRESS' } });
  }

  const lawyerName = session.name;
  await logActivity({
    action: 'COMPLETED',
    summary: `أنجز مهمة: ${task.description.slice(0, 70)}`,
    taskId: id,
    lawyerId: session.lawyerId,
    locationId: task.locationId,
    byLawyerId: session.lawyerId,
  });
  await notifyTaskCompleted(id, lawyerName, task.description.slice(0, 70), task.location.name);

  return json({ ok: true, completed: remaining === 0 });
});
