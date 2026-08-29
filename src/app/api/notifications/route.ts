import { prisma } from '@/lib/prisma';
import { handle, json, user } from '@/lib/api';
export async function GET() {
  const session = await user();
  if (!session) return json({ notifications: [], unread: 0 });
  const owner = session.role === 'admin' ? { userId: session.userId } : { lawyerId: session.lawyerId };
  const now = new Date();
  const where = session.role === 'admin' ? owner : { ...owner, OR: [{ type: { not: 'PERSONAL_REMINDER' } }, { type: 'PERSONAL_REMINDER', createdAt: { lte: now } }] };
  const [notifications, unread] = await Promise.all([prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: 40 }), prisma.notification.count({ where: { ...where, readAt: null } })]);
  return json({ notifications, unread });
}
export const POST = handle(async (_req: Request) => {
  const session = await user(); if (!session) return json({ error: 'سجّل الدخول أولاً' }, { status: 401 });
  const owner = session.role === 'admin' ? { userId: session.userId } : { lawyerId: session.lawyerId };
  await prisma.notification.updateMany({ where: { ...owner, readAt: null, ...(session.role === 'lawyer' ? { OR: [{ type: { not: 'PERSONAL_REMINDER' } }, { type: 'PERSONAL_REMINDER', createdAt: { lte: new Date() } }] } : {}) }, data: { readAt: new Date() } });
  return json({ ok: true });
});
