import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handle, json, readJson, user } from '@/lib/api';
import { logActivity } from '@/lib/activity';

type Ctx = { params: Promise<{ id: string }> };

/** Lawyers can edit/delete their own comments; admin can manage all comments. */
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const session = await user();
  if (!session) return json({ error: 'سجّل الدخول لتعديل التعليق' }, { status: 401 });

  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) return json({ error: 'التعليق غير موجود' }, { status: 404 });

  const isOwn =
    (session.role === 'lawyer' && comment.authorLawyerId === session.lawyerId) ||
    (session.role === 'admin' && comment.authorUserId === session.userId);
  if (!isOwn && session.role !== 'admin') {
    return json({ error: 'يمكنك تعديل تعليقاتك فقط' }, { status: 403 });
  }

  const data = await readJson(req as never, z.object({ text: z.string().min(1, 'النص مطلوب').max(2000) }));
  await prisma.comment.update({ where: { id }, data: { text: data.text.trim(), updatedAt: new Date() } });
  await logActivity({
    action: 'COMMENTED',
    summary: 'عدّل تعليقاً',
    byLawyerId: session.role === 'lawyer' ? session.lawyerId : null,
    byUserId: session.role === 'admin' ? session.userId : null,
  });
  return json({ ok: true });
});

export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const session = await user();
  if (!session) return json({ error: 'سجّل الدخول لحذف التعليق' }, { status: 401 });

  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) return json({ error: 'التعليق غير موجود' }, { status: 404 });

  const isOwn =
    (session.role === 'lawyer' && comment.authorLawyerId === session.lawyerId) ||
    (session.role === 'admin' && comment.authorUserId === session.userId);
  if (!isOwn && session.role !== 'admin') {
    return json({ error: 'يمكنك حذف تعليقاتك فقط' }, { status: 403 });
  }

  await prisma.comment.delete({ where: { id } });
  return json({ ok: true });
});
