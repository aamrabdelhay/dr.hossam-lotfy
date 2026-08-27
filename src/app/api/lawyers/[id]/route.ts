import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handle, json, readJson, requirePermission, user } from '@/lib/api';
import { logActivity } from '@/lib/activity';

type Ctx = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  fullName: z.string().min(3).max(120).optional(),
  title: z.enum(['DOCTOR', 'ADVOCATE']).optional(),
  phone: z.string().min(6).max(20).nullable().optional(),
  email: z.string().email().max(120).nullable().optional(),
  specialization: z.string().max(200).nullable().optional(),
  bio: z.string().max(2000).nullable().optional(),
  position: z.string().max(120).nullable().optional(),
  profilePhotoUrl: z.string().max(500).nullable().optional(),
  coverPhotoUrl: z.string().max(500).nullable().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  active: z.boolean().optional(),
});

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const session = await user();
  if (!session) return json({ error: 'سجّل الدخول أولاً' }, { status: 401 });

  const lawyer = await prisma.lawyer.findUnique({ where: { id } });
  if (!lawyer) return json({ error: 'المحامي غير موجود' }, { status: 404 });

  const isAdmin = session.role === 'admin';
  const isSelf = session.role === 'lawyer' && session.lawyerId === id;
  if (!isAdmin && !isSelf) {
    return json({ error: 'لا تملك صلاحية تعديل هذا الملف' }, { status: 403 });
  }

  const data = await readJson(req as never, updateSchema);

  // Self-updates are restricted to permitted fields
  let payload: Record<string, unknown> = data;
  if (!isAdmin) {
    payload = {
      phone: data.phone !== undefined ? data.phone : undefined,
      specialization: data.specialization !== undefined ? data.specialization : undefined,
      bio: data.bio !== undefined ? data.bio : undefined,
      profilePhotoUrl: data.profilePhotoUrl !== undefined ? data.profilePhotoUrl : undefined,
      coverPhotoUrl: data.coverPhotoUrl !== undefined ? data.coverPhotoUrl : undefined,
    };
  }

  const updated = await prisma.lawyer.update({ where: { id }, data: payload });
  await logActivity({
    action: data.profilePhotoUrl !== undefined ? 'PHOTO_UPDATED' : 'PROFILE_UPDATED',
    summary: `حدّث بيانات ملفه: ${lawyer.fullName}`,
    lawyerId: id,
    byUserId: isAdmin ? session.userId : null,
    byLawyerId: isSelf ? session.lawyerId : null,
  });

  return json({ ok: true, lawyer: updated });
});

/** Deactivate (soft) — admin only. Hard delete blocked while tasks exist (FKs). */
export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const session = await requirePermission('manageLawyers');
  const lawyer = await prisma.lawyer.findUnique({ where: { id }, include: { assignments: true } });
  if (!lawyer) return json({ error: 'المحامي غير موجود' }, { status: 404 });

  if (lawyer.assignments.length > 0) {
    await prisma.lawyer.update({ where: { id }, data: { active: false } });
    return json({ ok: true, deactivated: true, notice: 'تم إخفاء المحامي (لديه مهام مسجلة). استمر الإخفاء بدل الحذف للحفاظ على السجل.' });
  }
  await prisma.lawyer.delete({ where: { id } });
  await logActivity({ action: 'DELETED', summary: `حذف محامياً: ${lawyer.fullName}`, byUserId: session.userId });
  return json({ ok: true });
});
