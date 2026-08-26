import 'server-only';
import { prisma } from './prisma';

export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_EDITED'
  | 'SESSION_CRITICAL'
  | 'SESSION_TOMORROW'
  | 'COMMENT'
  | 'TASK_COMPLETED'
  | 'TASK_DELETED'
  | 'ANNOUNCEMENT';

async function notifyLawyer(lawyerId: string, type: NotificationType, title: string, body?: string, link?: string) {
  try {
    await prisma.notification.create({ data: { lawyerId, type, title, body, link } });
  } catch {
    /* never break main flow */
  }
}

async function notifyAdmin(userId: string, type: NotificationType, title: string, body?: string, link?: string) {
  try {
    await prisma.notification.create({ data: { userId, type, title, body, link } });
  } catch {
    /* never break main flow */
  }
}

export async function notifyTaskAssigned(lawyerIds: string[], taskTitle: string, when: string, link: string) {
  for (const id of lawyerIds) {
    await notifyLawyer(id, 'TASK_ASSIGNED', 'مهمة جديدة', `${taskTitle} — ${when}`, link);
  }
}

export async function notifyTaskEdited(lawyerIds: string[], taskTitle: string) {
  for (const id of lawyerIds) {
    await notifyLawyer(id, 'TASK_EDITED', 'تم تعديل مهمة', taskTitle, '/sessions');
  }
}

export async function notifyComment(taskId: string, taskLocationName: string, commentAuthor: string, commentText: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignees: true, author: true, createdBy: true },
  });
  if (!task) return;
  const targets = new Set<string>();
  for (const a of task.assignees) targets.add(a.lawyerId);
  if (task.authorId) targets.add(task.authorId);
  for (const id of targets) {
    if (id !== commentAuthor) await notifyLawyer(id, 'COMMENT', 'تعليق جديد', `${commentAuthor} علّق على: ${taskLocationName}`, `/sessions/${taskId}`);
  }
  // notify admins
  const admins = await prisma.user.findMany();
  for (const admin of admins) {
    if (admin.id !== commentAuthor) await notifyAdmin(admin.id, 'COMMENT', 'تعليق جديد', `${commentAuthor} على مهمة (${taskLocationName})`, `/sessions/${taskId}`);
  }
}

export async function notifyTaskCompleted(taskId: string, lawyerName: string, taskDesc: string, locationName: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { assignees: true } });
  if (!task) return;
  // notify all admins
  const admins = await prisma.user.findMany();
  for (const admin of admins) {
    await notifyAdmin(admin.id, 'TASK_COMPLETED', 'تم تنفيذ مهمة', `${lawyerName} أنجز: ${taskDesc} — ${locationName}`, `/sessions/${taskId}`);
  }
  // notify other assigned lawyers (team awareness)
  for (const a of task.assignees) {
    await notifyLawyer(a.lawyerId, 'TASK_COMPLETED', 'تم تنفيذ مهمة', `${lawyerName} أنجز: ${taskDesc}`, `/sessions/${taskId}`);
  }
}

export async function notifyTaskDeleted(taskId: string, lawyerIds: string[], taskDesc: string) {
  for (const id of lawyerIds) {
    await notifyLawyer(id, 'TASK_DELETED', 'تم حذف مهمة', taskDesc, '/');
  }
}
