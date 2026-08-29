import { z } from 'zod';
import { handle, json, readJson, user } from '@/lib/api';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  title: z.string().min(1, 'عنوان التذكير مطلوب').max(200),
  note: z.string().max(1000).optional(),
  remindAt: z.string().datetime({ offset: true }),
});

export const POST = handle(async (req: Request) => {
  const session = await user();
  if (!session) return json({ error: 'سجّل الدخول أولاً' }, { status: 401 });
  const data = await readJson(req as never, schema);
  const remindAt = new Date(data.remindAt);
  if (Number.isNaN(remindAt.getTime())) return json({ error: 'موعد التذكير غير صالح' }, { status: 400 });

  const body = data.note?.trim() ? `${data.note.trim()} — موعد التذكير: ${remindAt.toLocaleString('ar-EG')}` : `موعد التذكير: ${remindAt.toLocaleString('ar-EG')}`;
  const base = { type: 'PERSONAL_REMINDER', title: data.title.trim(), body, link: '/notifications', createdAt: remindAt };

  if (session.role === 'lawyer') {
    await prisma.notification.create({ data: { ...base, lawyerId: session.lawyerId } });
    const admins = await prisma.user.findMany({ select: { id: true } });
    if (admins.length) await prisma.notification.createMany({ data: admins.map((a) => ({ ...base, userId: a.id })) });
  } else {
    await prisma.notification.create({ data: { ...base, userId: session.userId } });
  }

  return json({ ok: true });
});
