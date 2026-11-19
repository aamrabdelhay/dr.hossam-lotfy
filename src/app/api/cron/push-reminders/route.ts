import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  return Boolean(secret && req.headers.get('authorization') === `Bearer ${secret}`);
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();
  if (!publicKey || !privateKey || !subject) {
    return NextResponse.json({ error: 'VAPID configuration missing' }, { status: 503 });
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const due = await prisma.notification.findMany({
    where: { createdAt: { lte: new Date() }, pushSentAt: null },
    orderBy: { createdAt: 'asc' },
    take: 100,
    select: { id: true, userId: true, lawyerId: true, title: true, body: true, link: true }
  });
  let sent = 0, failed = 0, devices = 0;
  for (const notification of due) {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: notification.userId ? { userId: notification.userId } : notification.lawyerId ? { lawyerId: notification.lawyerId } : { id: '__none__' }
    });
    let delivered = 0;
    for (const sub of subscriptions) {
      devices++;
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title: notification.title, body: notification.body || 'لديك تذكير جديد من مكتب لوتفي.', url: notification.link || '/notifications', tag: notification.id }),
          { TTL: 60 * 60 * 24 }
        );
        delivered++;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
        }
        failed++;
      }
    }
    if (delivered > 0 || subscriptions.length === 0) {
      await prisma.notification.update({ where: { id: notification.id }, data: { pushSentAt: new Date() } });
      sent++;
    }
  }
  return NextResponse.json({ ok: true, processed: due.length, sent, failed, devices });
}
