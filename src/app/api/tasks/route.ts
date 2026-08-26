import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getFeed, toTaskVM, type TaskVM } from '@/lib/queries';
import { handle, json, readJson, requireAdmin, requireLawyer, user } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { notifyTaskAssigned } from '@/lib/notifications';
import { formatDay } from '@/lib/dates';

// ─────────────────────────── GET ───────────────────────────

export const GET = handle(async (req: Request) => {
  const url = new URL(req.url);
  const { items, total } = await getFeed({
    lawyerId: url.searchParams.get('lawyerId') ?? undefined,
    locationId: url.searchParams.get('locationId') ?? undefined,
    status: url.searchParams.get('status') ?? undefined,
    from: url.searchParams.get('from') ?? undefined,
    to: url.searchParams.get('to') ?? undefined,
    limit: Math.min(500, Math.max(1, parseInt(url.searchParams.get('limit') ?? '30', 10) || 30)),
    offset: Math.max(0, parseInt(url.searchParams.get('offset') ?? '0', 10) || 0),
  });
  return json({ items, total });
});

// ─────────────────────────── POST ───────────────────────────

const createSchema = z
  .object({
    locationId: z.string().min(1, 'المكان مطلوب'),
    description: z.string().min(2, 'وصف المهمة مطلوب').max(2000),
    notes: z.string().max(4000).optional(),
    caseName: z.string().max(300).optional(),
    caseNumber: z.string().max(200).optional(),
    scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاريخ غير صالح').optional(),
    scheduledTime: z.string().regex(/^\d{2}:\d{2}$/, 'ساعة غير صالحة').optional(),
    lawyerIds: z.array(z.string()).min(1, 'اختر محامياً واحداً على الأقل').max(20, 'الحد الأقصى 20 محامياً في العملية الواحدة').optional(),
    ownPost: z.boolean().optional(),
  })
  .refine((d) => d.ownPost || (d.lawyerIds && d.lawyerIds.length > 0), {
    message: 'اختر المحامي/المحامين المكلفين',
    path: ['lawyerIds'],
  });

export const POST = handle(async (req: Request) => {
  const session = await user();
  const data = await readJson(req as never, createSchema);

  if (!session) {
    return json({ error: 'يجب تسجيل الدخول لإضافة مهمة' }, { status: 401 });
  }

  const isOwnPost = !!data.ownPost && session.role === 'lawyer';
  const isAdminCreate = session.role === 'admin';
  if (!isOwnPost && !isAdminCreate) {
    return json({ error: 'لا تملك صلاحية إضافة مهمة' }, { status: 403 });
  }

  const location = await prisma.location.findUnique({ where: { id: data.locationId } });
  if (!location) return json({ error: 'المكان غير موجود' }, { status: 404 });

  let caseId: string | undefined;
  if (data.caseName || data.caseNumber) {
    const name = data.caseName ?? '';
    const number = data.caseNumber ?? '';
    let existing = null as { id: string } | null;
    if (name && number) existing = await prisma.caseRecord.findFirst({ where: { name, number } });
    if (!existing && number) existing = await prisma.caseRecord.findFirst({ where: { number } });
    caseId = existing?.id;
    if (!caseId) {
      const c = await prisma.caseRecord.create({ data: { name, number } });
      caseId = c.id;
    }
  }

  const lawyerIds = isOwnPost ? [session.lawyerId] : (data.lawyerIds as string[]);
  const lawyers = await prisma.lawyer.findMany({ where: { id: { in: lawyerIds }, active: true } });
  if (lawyers.length !== new Set(lawyerIds).size) {
    return json({ error: 'أحد المحامين المحددين غير موجود' }, { status: 400 });
  }

  const task = await prisma.task.create({
    data: {
      locationId: location.id,
      caseId,
      description: data.description.trim(),
      notes: data.notes?.trim() || null,
      scheduledDate: data.scheduledDate ? new Date(`${data.scheduledDate}T00:00:00`) : null,
      scheduledTime: data.scheduledTime || null,
      authorId: isOwnPost ? session.lawyerId : null,
      createdById: session.role === 'admin' ? session.userId : null,
      assignees: { create: lawyerIds.map((lawyerId) => ({ lawyerId })) },
    },
    include: {
      location: true,
      caseRecord: true,
      author: { select: { id: true, fullName: true, title: true, slug: true, profilePhotoUrl: true } },
      assignees: { select: { lawyer: { select: { id: true, fullName: true, title: true, slug: true, profilePhotoUrl: true } }, completedAt: true } },
      comments: { select: { createdAt: true } },
    },
  });

  const when = task.scheduledDate ? `${formatDay(task.scheduledDate)}${task.scheduledTime ? ` — ${task.scheduledTime}` : ''}` : 'بالتنسيق';
  await logActivity({
    action: 'CREATED',
    summary: `أنشأ مهمة جديدة: ${task.description.slice(0, 80)}`,
    taskId: task.id,
    locationId: location.id,
    byUserId: session.role === 'admin' ? session.userId : null,
    byLawyerId: isOwnPost ? session.lawyerId : null,
  });
  await notifyTaskAssigned(
    lawyerIds,
    task.description.slice(0, 60),
    when,
    `/sessions/${task.id}`,
  );

  const vm = toTaskVM(task as never) as TaskVM;
  return json({ ok: true, task: vm, createdCount: lawyerIds.length }, { status: 201 });
});
