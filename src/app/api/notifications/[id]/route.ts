import { prisma } from '@/lib/prisma';
import { handle, json, user } from '@/lib/api';

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/notifications/[id] — تعليم إشعار واحد كمقروء (للمالك فقط).
 * Idempotent: الإشعار المقروء بالفعل يرجع ok بدون خطأ.
 */
export const PATCH = handle(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const session = await user();
  if (!session) return json({ error: 'سجّل الدخول أولاً' }, { status: 401 });

  const where =
    session.role === 'admin'
      ? { id, userId: session.userId }
      : { id, lawyerId: session.lawyerId };

  const notification = await prisma.notification.findFirst({ where });
  if (!notification) return json({ error: 'الإشعار غير موجود' }, { status: 404 });

  if (!notification.readAt) {
    await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }
  return json({ ok: true });
});
