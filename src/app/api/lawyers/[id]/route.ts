import { z } from 'zod';
import { handle, json, readJson, requirePermission, user } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

type Ctx = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  fullName: z.string().min(3).max(120).optional(),
  title: z.enum(['DOCTOR', 'ADVOCATE']).optional(),
  phone: z.string().min(6).max(20).nullable().optional(),
  email: z.string().email().max(120).nullable().optional(),
  googleEmail: z.string().email().max(120).nullable().optional(),
  specialization: z.string().max(200).nullable().optional(),
  bio: z.string().max(2000).nullable().optional(),
  position: z.string().max(120).nullable().optional(),
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
  if (!isAdmin && !isSelf) return json({ error: 'لا تملك صلاحية تعديل هذا الملف' }, { status: 403 });

  const data = await readJson(req as never, updateSchema);
  if (!isAdmin && (data.active !== undefined || data.sortOrder !== undefined)) return json({ error: 'لا تملك صلاحية تغيير إعدادات الحساب الإدارية' }, { status: 403 });

  const payload: Record<string, unknown> = isAdmin
    ? data
    : { fullName: data.fullName, title: data.title, phone: data.phone, email: data.email, googleEmail: data.googleEmail, specialization: data.specialization, bio: data.bio, position: data.position };
  for (const key of Object.keys(payload)) if (payload[key] === undefined) delete payload[key];

  // Lawyer photos are intentionally disabled for the entire office.
  const updated = await prisma.lawyer.update({ where: { id }, data: { ...payload, profilePhotoUrl: null, coverPhotoUrl: null } });

  if (isAdmin && data.active !== undefined && data.active !== lawyer.active) {
    await logActivity({ action: data.active ? 'LAWYER_REACTIVATED' : 'LAWYER_DEACTIVATED', summary: data.active ? `أعاد تفعيل المحامي: ${lawyer.fullName}` : `عطّل المحامي: ${lawyer.fullName}`, lawyerId: id, byUserId: session.userId });
  } else {
    await logActivity({ action: 'PROFILE_UPDATED', summary: `${isAdmin ? 'حدّث بيانات المحامي' : 'حدّث بيانات ملفه'}: ${lawyer.fullName}`, lawyerId: id, byUserId: isAdmin ? session.userId : null, byLawyerId: isSelf ? session.lawyerId : null });
  }
  return json({ ok: true, lawyer: updated });
});

export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const session = await requirePermission('manageLawyers');
  const lawyer = await prisma.lawyer.findUnique({ where: { id }, include: { assignments: true } });
  if (!lawyer) return json({ error: 'المحامي غير موجود' }, { status: 404 });
  if (lawyer.assignments.length > 0) {
    await prisma.lawyer.update({ where: { id }, data: { active: false } });
    await logActivity({ action: 'LAWYER_DEACTIVATED', summary: `عطّل المحامي: ${lawyer.fullName}`, lawyerId: id, byUserId: session.userId });
    return json({ ok: true, deactivated: true, notice: 'تم إخفاء المحامي (لديه مهام مسجلة). استمر الإخفاء بدل الحذف للحفاظ على السجل.' });
  }
  await prisma.lawyer.delete({ where: { id } });
  await logActivity({ action: 'DELETED', summary: `حذف محامياً: ${lawyer.fullName}`, byUserId: session.userId });
  return json({ ok: true });
});
