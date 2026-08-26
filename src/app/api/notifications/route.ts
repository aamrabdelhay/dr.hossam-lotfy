import { prisma } from '@/lib/prisma';
import { handle, json, user } from '@/lib/api';

export async function GET() {
  const session = await user();
  if (!session) return json({ notifications: [], unread: 0 });
  const where =
    session.role === 'admin'
      ? { userId: session.userId }
      : { lawyerId: session.lawyerId };
  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: 40 }),
    prisma.notification.count({ where: { ...where, readAt: null } }),
  ]);
  return json({ notifications, unread });
}

/** Mark all as read. */
export const POST = handle(async (_req: Request) => {
  const session = await user();
  if (!session) return json({ error: 'سجّل الدخول أولاً' }, { status: 401 });
  const where = session.role === 'admin' ? { userId: session.userId } : { lawyerId: session.lawyerId };
  await prisma.notification.updateMany({ where: { ...where, readAt: null }, data: { readAt: new Date() } });
  return json({ ok: true });
});
