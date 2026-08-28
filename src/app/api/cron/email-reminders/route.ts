import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isMailConfigured, officeCcRecipients, sendSessionReminder } from '@/lib/mail';
import { appOrigin } from '@/lib/google-oauth';
import { formatDay } from '@/lib/dates';

export const dynamic = 'force-dynamic';

/**
 * Session reminder cron. Morning runs send 14/7/3-day reminders; the evening
 * run sends the night-before reminder. email_reminders makes every window
 * idempotent so repeated cron calls cannot duplicate a reminder.
 */

const MORNING_WINDOWS: Array<{ days: number; kind: string; label: string }> = [
  { days: 14, kind: 'session-14', label: '14 يوماً' },
  { days: 7, kind: 'session-7', label: '7 أيام' },
  { days: 3, kind: 'session-3', label: '3 أيام' },
];
const NIGHT_WINDOW = { days: 1, kind: 'session-1', label: 'غداً' };

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return true;
  const auth = req.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isNightRun(): boolean {
  // Vercel cron schedules are UTC. 16:00 UTC is 19:00 in Egypt during the
  // current UTC+3 period, which is an appropriate "night before" reminder.
  const hour = new Date().getUTCHours();
  return hour >= 16 && hour < 18;
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!isMailConfigured()) return NextResponse.json({ ok: true, skipped: 'smtp-not-configured', sent: 0 });

  const today = startOfDay(new Date());
  const window = isNightRun() ? NIGHT_WINDOW : null;
  const targetDays = window ? [window.days] : MORNING_WINDOWS.map((w) => w.days);
  const min = new Date(today);
  min.setDate(min.getDate() + Math.min(...targetDays));
  const max = new Date(today);
  max.setDate(max.getDate() + Math.max(...targetDays) + 1);

  const [tasks, principal] = await Promise.all([
    prisma.task.findMany({
      where: { scheduledDate: { gte: min, lt: max }, status: { in: ['PENDING', 'IN_PROGRESS'] } },
      include: { location: true, assignees: { include: { lawyer: true } } },
    }),
    prisma.lawyer.findFirst({ where: { isPrincipal: true, active: true } }),
  ]);

  const principalEmail = principal?.googleEmail ?? principal?.email ?? null;
  const cc = officeCcRecipients(principalEmail);
  let sent = 0;
  const errors: string[] = [];

  for (const task of tasks) {
    const scheduled = task.scheduledDate;
    if (!scheduled) continue;
    const daysLeft = Math.round((startOfDay(scheduled).getTime() - today.getTime()) / 86400000);
    const selectedWindow = window ?? MORNING_WINDOWS.find((w) => w.days === daysLeft);
    if (!selectedWindow || selectedWindow.days !== daysLeft) continue;

    for (const a of task.assignees) {
      const lawyer = a.lawyer;
      if (!lawyer || !lawyer.approvedAt) continue;
      const recipient = lawyer.googleEmail ?? lawyer.email;
      if (!recipient) continue;

      const already = await prisma.emailReminder.findUnique({
        where: { taskId_lawyerId_kind: { taskId: task.id, lawyerId: lawyer.id, kind: selectedWindow.kind } },
      });
      if (already) continue;

      const ok = await sendSessionReminder({
        to: recipient,
        cc,
        lawyerName: lawyer.fullName,
        taskDesc: (task.description || task.location.name).slice(0, 120),
        locationName: task.location.name,
        dateLabel: formatDay(scheduled),
        timeLabel: task.scheduledTime ?? '',
        url: `${appOrigin()}/sessions/${task.id}`,
        windowLabel: selectedWindow.label,
      });

      if (ok) {
        await prisma.emailReminder.create({ data: { taskId: task.id, lawyerId: lawyer.id, kind: selectedWindow.kind } }).catch(() => undefined);
        sent += 1;
      } else {
        errors.push(`${lawyer.fullName} (${selectedWindow.label})`);
      }
    }
  }

  return NextResponse.json({ ok: true, sent, candidates: tasks.length, window: window?.kind ?? 'morning', errors });
}
