import { z } from 'zod';
import { handle, json, readJson, user } from '@/lib/api';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({ p256dh: z.string().min(20), auth: z.string().min(10) })
});

export const POST = handle(async (req: Request) => {
  const session = await user();
  if (!session) return json({ error: 'سجّل الدخول أولاً' }, { status: 401 });
  const data = await readJson(req, schema);
  const owner = session.role === 'admin'
    ? { userId: session.userId, lawyerId: null }
    : { lawyerId: session.lawyerId, userId: null };
  await prisma.pushSubscription.upsert({
    where: { endpoint: data.endpoint },
    create: { endpoint: data.endpoint, p256dh: data.keys.p256dh, auth: data.keys.auth, ...owner },
    update: { p256dh: data.keys.p256dh, auth: data.keys.auth, ...owner }
  });
  return json({ ok: true });
});

export const DELETE = handle(async (req: Request) => {
  const session = await user();
  if (!session) return json({ error: 'سجّل الدخول أولاً' }, { status: 401 });
  const body = await req.json().catch(() => ({})) as { endpoint?: string };
  if (!body.endpoint) return json({ error: 'عنوان الجهاز مطلوب' }, { status: 400 });
  await prisma.pushSubscription.deleteMany({
    where: {
      endpoint: body.endpoint,
      ...(session.role === 'admin' ? { userId: session.userId } : { lawyerId: session.lawyerId })
    }
  });
  return json({ ok: true });
});
