import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isMailConfigured, sendSessionReminder } from '@/lib/mail';
import { appOrigin } from '@/lib/google-oauth';
import { formatDay } from '@/lib/dates';

export const dynamic = 'force-dynamic';

/**
 * Daily session-reminder cron (see vercel.json → crons). Vercel calls this
 * route with `Authorization: Bearer <CRON_SECRET>`; a mismatch (or a missing
 * header when CRON_SECRET is configured) is rejected with 401.
 *
 * It e-mails every approved lawyer with a Gmail address about their sessions
 * scheduled for today or tomorrow, and records each delivery in
 * `email_reminders` so a reminder is never sent twice.
 */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return true; // local/dev convenience only
  const auth = req.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!isMailConfigured()) {
    return NextResponse.json({ ok: true, skipped: 'smtp-not-configured', sent: 0 });
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 2); // today + tomorrow (inclusive of both days)

  const tasks = await prisma.task.findMany({
    where: {
      scheduledDate: { gte: start, lt: end },
      status: { in: ['PENDING', 'IN_PROGRESS'] },
    },
    include: {
      location: true,
      assignees: { include: { lawyer: true } },
    },
  });

  let sent = 0;
  const errors: string[] = [];
  for (const task of tasks) {
    for (const a of task.assignees) {
      const lawyer = a.lawyer;
      if (!lawyer || !lawyer.approvedAt || !lawyer.googleEmail) continue;

      const already = await prisma.emailReminder.findUnique({
        where: { taskId_lawyerId_kind: { taskId: task.id, lawyerId: lawyer.id, kind: 'session' } },
      });
      if (already) continue;

      const dateLabel = task.scheduledDate ? formatDay(new Date(task.scheduledDate)) : '';
      const ok = await sendSessionReminder({
        to: lawyer.googleEmail,
        lawyerName: lawyer.fullName,
        taskDesc: (task.description || task.location.name).slice(0, 120),
        locationName: task.location.name,
        dateLabel,
        timeLabel: task.scheduledTime ?? '',
        url: `${appOrigin()}/sessions/${task.id}`,
      });

      if (ok) {
        await prisma.emailReminder
          .create({ data: { taskId: task.id, lawyerId: lawyer.id, kind: 'session' } })
          .catch(() => undefined);
        sent += 1;
      } else {
        errors.push(lawyer.fullName);
      }
    }
  }

  return NextResponse.json({ ok: true, sent, candidates: tasks.length, errors });
}
