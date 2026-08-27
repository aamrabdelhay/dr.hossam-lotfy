import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isMailConfigured, officeCcRecipients, sendSessionReminder } from '@/lib/mail';
import { appOrigin } from '@/lib/google-oauth';
import { formatDay } from '@/lib/dates';

export const dynamic = 'force-dynamic';

/**
 * Daily session-reminder cron (see vercel.json → crons, 07:00). Vercel calls
 * this route with `Authorization: Bearer <CRON_SECRET>`; a mismatch (or a
 * missing header when CRON_SECRET is configured) is rejected with 401.
 *
 * It e-mails every approved lawyer with a Gmail address about their sessions
 * 14, 7 and 3 days before the date. Each delivery is recorded in
 * `email_reminders` with a distinct kind (session-14 / session-7 / session-3)
 * so the same reminder is never sent twice.
 *
 * Primary recipient: the responsible lawyer.
 * CC: ADMIN_NOTIFY_EMAILS + the principal lawyer (Dr. Hossam Lotfy) +
 *     ADMIN_EMAIL, de-duplicated.
 */

const WINDOWS: Array<{ days: number; kind: string; label: string }> = [
  { days: 14, kind: 'session-14', label: '14 يوماً' },
  { days: 7, kind: 'session-7', label: '7 أيام' },
  { days: 3, kind: 'session-3', label: '3 أيام' },
];

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return true; // local/dev convenience only
  const auth = req.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!isMailConfigured()) {
    return NextResponse.json({ ok: true, skipped: 'smtp-not-configured', sent: 0 });
  }

  const today = startOfDay(new Date());
  const targetDays = WINDOWS.map((w) => w.days);
  const min = new Date(today);
  min.setDate(min.getDate() + Math.min(...targetDays));
  const max = new Date(today);
  max.setDate(max.getDate() + Math.max(...targetDays) + 1);

  const [tasks, principal] = await Promise.all([
    prisma.task.findMany({
      where: {
        scheduledDate: { gte: min, lt: max },
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      include: {
        location: true,
        assignees: { include: { lawyer: true } },
      },
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
    const window = WINDOWS.find((w) => w.days === daysLeft);
    if (!window) continue;

    for (const a of task.assignees) {
      const lawyer = a.lawyer;
      if (!lawyer || !lawyer.approvedAt || !lawyer.googleEmail) continue;

      const already = await prisma.emailReminder.findUnique({
        where: { taskId_lawyerId_kind: { taskId: task.id, lawyerId: lawyer.id, kind: window.kind } },
      });
      if (already) continue;

      const dateLabel = formatDay(scheduled);
      const ok = await sendSessionReminder({
        to: lawyer.googleEmail,
        cc,
        lawyerName: lawyer.fullName,
        taskDesc: (task.description || task.location.name).slice(0, 120),
        locationName: task.location.name,
        dateLabel,
        timeLabel: task.scheduledTime ?? '',
        url: `${appOrigin()}/sessions/${task.id}`,
        windowLabel: window.label,
      });

      if (ok) {
        await prisma.emailReminder
          .create({ data: { taskId: task.id, lawyerId: lawyer.id, kind: window.kind } })
          .catch(() => undefined);
        sent += 1;
      } else {
        errors.push(`${lawyer.fullName} (${window.label})`);
      }
    }
  }

  return NextResponse.json({ ok: true, sent, candidates: tasks.length, windows: WINDOWS.map((w) => w.kind), errors });
}
