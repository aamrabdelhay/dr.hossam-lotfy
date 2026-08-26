import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handle, json, requireLawyer } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { notifyTaskCompleted } from '@/lib/notifications';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Only the lawyer who is ASSIGNED to this task may mark it complete.
 * A lawyer can never mark another lawyer's task as completed (server-enforced).
 */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const session = await requireLawyer();

  const task = await prisma.task.findUnique({
    where: { id },
    include: { assignees: { include: { lawyer: true } }, location: true, author: true },
  });
  if (!task) return json({ error: 'المهمة غير موجودة' }, { status: 404 });

  const mine = task.assignees.find((a) => a.lawyerId === session.lawyerId);
  if (!mine) {
    return json({ error: 'لا يمكنك تنفيذ مهمة غير مسندة إليك' }, { status: 403 });
  }
  if (mine.completedAt) return json({ error: 'هذه المهمة مسجلة كمكتملة بالفعل' }, { status: 409 });
  if (task.status === 'CANCELLED') return json({ error: 'المهمة ملغاة' }, { status: 409 });

  const now = new Date();
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
