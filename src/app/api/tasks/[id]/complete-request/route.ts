import { z } from 'zod';
import { handle, json, readJson, requireLawyer } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({ notificationId: z.string().min(1), action: z.enum(['approve', 'reject']) });

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const session = await requireLawyer();
  const { id } = await ctx.params;
  const data = await readJson(req as never, schema);
  const assignment = await prisma.taskAssignment.findUnique({ where: { taskId_lawyerId: { taskId: id, lawyerId: session.lawyerId } }, include: { task: { include: { location: true } } } });
  if (!assignment) return json({ error: 'هذا التكليف غير مسند إليك' }, { status: 403 });

  const notification = await prisma.notification.findFirst({ where: { id: data.notificationId, lawyerId: session.lawyerId, type: 'TASK_COMPLETION_REQUEST' } });
  if (!notification) return json({ error: 'طلب الإنهاء غير موجود' }, { status: 404 });
  if (notification.readAt) return json({ error: 'تم التعامل مع هذا الطلب بالفعل' }, { status: 409 });

  await prisma.notification.update({ where: { id: notification.id }, data: { readAt: new Date() } });
  if (data.action === 'reject') {
    await logActivity({ action: 'COMPLETION_REJECTED', summary: `رفض ${session.name} إنهاء التكليف نيابةً عنه: ${assignment.task.description.slice(0, 70)}`, taskId: id, lawyerId: session.lawyerId, locationId: assignment.task.locationId, byLawyerId: session.lawyerId });
    return json({ ok: true, approved: false });
  }

  if (assignment.completedAt) return json({ error: 'هذا التكليف مكتمل بالفعل' }, { status: 409 });
  const now = new Date();
  await prisma.taskAssignment.update({ where: { id: assignment.id }, data: { completedAt: now, completedById: session.lawyerId } });
  const remaining = await prisma.taskAssignment.count({ where: { taskId: id, completedAt: null } });
  await prisma.task.update({ where: { id }, data: remaining === 0 ? { status: 'COMPLETED', completedAt: now } : { status: 'IN_PROGRESS' } });
  await logActivity({ action: 'COMPLETED_BY_APPROVAL', summary: `وافق ${session.name} على إنهاء التكليف الذي طلبته الإدارة: ${assignment.task.description.slice(0, 70)}`, taskId: id, lawyerId: session.lawyerId, locationId: assignment.task.locationId, byLawyerId: session.lawyerId });
  return json({ ok: true, approved: true, completed: remaining === 0 });
});
