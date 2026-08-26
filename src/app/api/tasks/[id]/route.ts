import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getTaskVM } from '@/lib/queries';
import { handle, json, readJson, requireAdmin, user } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { notifyTaskEdited, notifyTaskDeleted } from '@/lib/notifications';

type Ctx = { params: Promise<{ id: string }> };

// ─────────────────────────── GET ───────────────────────────

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const task = await getTaskVM(id);
  if (!task) return json({ error: 'المهمة غير موجودة' }, { status: 404 });
  return json({ task });
}

// ─────────────────────────── PATCH ───────────────────────────

const updateSchema = z.object({
  locationId: z.string().min(1).optional(),
  description: z.string().min(2, 'وصف المهمة مطلوب').max(2000).optional(),
  notes: z.string().max(4000).nullable().optional(),
  caseName: z.string().max(300).nullable().optional(),
  caseNumber: z.string().max(200).nullable().optional(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  lawyerIds: z.array(z.string()).max(20, 'الحد الأقصى 20 محامياً').optional(),
});

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const session = await user();
  if (!session) return json({ error: 'يجب تسجيل الدخول للتعديل' }, { status: 401 });

  const task = await prisma.task.findUnique({ where: { id }, include: { assignees: true, location: true, caseRecord: true } });
  if (!task) return json({ error: 'المهمة غير موجودة' }, { status: 404 });

  const isAdmin = session.role === 'admin';
  const isAuthor = session.role === 'lawyer' && task.authorId === session.lawyerId;
  if (!isAdmin && !isAuthor) {
    return json({ error: 'يمكنك تعديل بوستاتك فقط' }, { status: 403 });
  }

  const data = await readJson(req as never, updateSchema);

  // lawyers may edit content of their own posts but not the assignment set or status
  let lawyerIds: string[] | undefined;
  let status = data.status;
  if (!isAdmin) {
    lawyerIds = undefined;
    status = task.status; // only the complete endpoint changes status
  }

  const location = data.locationId ? await prisma.location.findUnique({ where: { id: data.locationId } }) : task.location;
  if (data.locationId && !location) return json({ error: 'المكان غير موجود' }, { status: 404 });

  let caseId = task.caseId ?? undefined;
  const caseTouched = data.caseName !== undefined || data.caseNumber !== undefined;
  if (caseTouched && isAdmin) {
    const caseName = data.caseName ?? null;
    const caseNumber = data.caseNumber ?? null;
    if (caseName || caseNumber) {
      const existing = await prisma.caseRecord.findFirst({ where: { name: caseName ?? '', number: caseNumber ?? '' } });
      caseId = existing?.id;
      if (!caseId) {
        const c = await prisma.caseRecord.create({ data: { name: caseName ?? '', number: caseNumber ?? '' } });
        caseId = c.id;
      }
    } else {
      caseId = undefined;
    }
  }

  if (lawyerIds && lawyerIds.length > 0) {
    const lawyers = await prisma.lawyer.findMany({ where: { id: { in: lawyerIds }, active: true } });
    if (lawyers.length !== new Set(lawyerIds).size) return json({ error: 'أحد المحامين المحددين غير موجود' }, { status: 400 });
  }

  await prisma.task.update({
    where: { id },
    data: {
      locationId: location?.id,
      caseId: caseTouched ? (caseId ?? null) : undefined,
      description: data.description?.trim(),
      notes: data.notes !== undefined ? (data.notes?.trim() || null) : undefined,
      scheduledDate: data.scheduledDate !== undefined ? (data.scheduledDate ? new Date(`${data.scheduledDate}T00:00:00`) : null) : undefined,
      scheduledTime: data.scheduledTime !== undefined ? (data.scheduledTime || null) : undefined,
      status,
    },
  });

  if (lawyerIds && lawyerIds.length > 0) {
    const existing = await prisma.taskAssignment.findMany({ where: { taskId: id } });
    const keep = existing.filter((a) => lawyerIds.includes(a.lawyerId));
    const remove = existing.filter((a) => !lawyerIds.includes(a.lawyerId));
    const add = lawyerIds.filter((lid) => !existing.some((a) => a.lawyerId === lid));
    await prisma.$transaction([
      ...remove.map((a) => prisma.taskAssignment.delete({ where: { id: a.id } })),
      ...add.map((lawyerId) => prisma.taskAssignment.create({ data: { taskId: id, lawyerId } })),
    ]);
    await notifyTaskEdited(add, task.description);
    await logActivity({
      action: add.length > 0 ? 'ASSIGNED' : 'REASSIGNED',
      summary: `عدّل إسناد المهمة: ${task.description.slice(0, 60)}`,
      taskId: id,
      byUserId: isAdmin ? session.userId : null,
    });
  }

  await logActivity({
    action: 'EDITED',
    summary: `عدّل مهمة: ${task.description.slice(0, 60)}`,
    taskId: id,
    locationId: task.locationId,
    byUserId: session.role === 'admin' ? session.userId : null,
    byLawyerId: session.role === 'lawyer' ? session.lawyerId : null,
  });

  const vm = await getTaskVM(id);
  return json({ ok: true, task: vm });
});

// ─────────────────────────── DELETE ───────────────────────────

export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const session = await requireAdmin();
  const task = await prisma.task.findUnique({ where: { id }, include: { assignees: true } });
  if (!task) return json({ error: 'المهمة غير موجودة' }, { status: 404 });

  await prisma.task.delete({ where: { id } });
  await logActivity({
    action: 'DELETED',
    summary: `حذف مهمة: ${task.description.slice(0, 60)}`,
    locationId: task.locationId,
    byUserId: session.userId,
  });
  await notifyTaskDeleted(id, task.assignees.map((a) => a.lawyerId), task.description.slice(0, 60));
  return json({ ok: true });
});
