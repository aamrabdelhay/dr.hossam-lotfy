import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handle, json, readJson, requireAdmin } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { ASSIGNABLE_ROLES } from '@/lib/constants';

type Ctx = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().min(3, 'الاسم مطلوب').max(120).optional(),
  email: z.string().email('بريد إلكتروني غير صالح').max(160).optional(),
  role: z.enum(ASSIGNABLE_ROLES, { message: 'اختر دوراً صحيحاً' }).optional(),
  password: z.string().min(8, 'كلمة المرور 8 أحرف على الأقل').max(200).optional().or(z.literal('')),
});

/** Edit a staff account — SUPER_ADMIN only. Super-admin accounts are immutable here. */
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const session = await requireAdmin();
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return json({ error: 'الحساب غير موجود' }, { status: 404 });
  if (target.role === 'SUPER_ADMIN' || target.role === 'ADMIN') {
    return json({ error: 'لا يمكن تعديل حساب المدير العام من هنا' }, { status: 403 });
  }

  const data = await readJson(req as never, updateSchema);
  const patch: Record<string, unknown> = {};
  if (data.name) patch.name = data.name.trim();
  if (data.role) patch.role = data.role;
  if (data.password) patch.passwordHash = await bcrypt.hash(data.password, 12);
  if (data.email) {
    const email = data.email.toLowerCase().trim();
    const clash = await prisma.user.findFirst({ where: { email, NOT: { id } } });
    if (clash) return json({ error: 'يوجد حساب بهذا البريد الإلكتروني بالفعل' }, { status: 409 });
    patch.email = email;
  }
  if (Object.keys(patch).length === 0) return json({ error: 'لا توجد تغييرات' }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id },
    data: patch,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  // Changing role or password invalidates every existing session of that user.
  if (patch.role || patch.passwordHash) {
    await prisma.authSession.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  await logActivity({
    action: 'USER_UPDATED',
    summary: `عدّل حساب فريق: ${updated.name} (${updated.role})`,
    byUserId: session.userId,
  });

  return json({ ok: true, user: { ...updated, createdAt: updated.createdAt.toISOString() } });
});

/** Delete a staff account — SUPER_ADMIN only, never yourself nor another super-admin. */
export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const session = await requireAdmin();
  if (id === session.userId) return json({ error: 'لا يمكنك حذف حسابك الحالي' }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return json({ error: 'الحساب غير موجود' }, { status: 404 });
  if (target.role === 'SUPER_ADMIN' || target.role === 'ADMIN') {
    return json({ error: 'لا يمكن حذف حساب المدير العام' }, { status: 403 });
  }

  await prisma.authSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
  await prisma.user.delete({ where: { id } });
  await logActivity({ action: 'USER_DELETED', summary: `حذف حساب فريق: ${target.name}`, byUserId: session.userId });
  return json({ ok: true });
});
