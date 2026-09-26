import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isMailConfigured, officeCcRecipients, sendSessionReminder } from '@/lib/mail';
import { appOrigin } from '@/lib/google-oauth';
import { formatDay } from '@/lib/dates';
import { escapeTelegramHtml, isTelegramConfigured, sendTelegramGroupNotification } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

const MORNING_WINDOWS: Array<{ days: number; kind: string; label: string }> = [
  { days: 14, kind: 'session-14', label: '14 يوماً' },
  { days: 7, kind: 'session-7', label: '7 أيام' },
  { days: 3, kind: 'session-3', label: '3 أيام' },
];
const NIGHT_WINDOW = { days: 1, kind: 'session-1', label: 'غداً' };
const TELEGRAM_DAILY_KEY = 'telegram_daily_summary';

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return true;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

function isNightRun(): boolean {
  const hour = new Date().getUTCHours();
  return hour >= 16 && hour < 18;
}

function cairoDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function shiftDateKey(key: string, days: number): string {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function prettyDate(key: string): string {
  return new Intl.DateTimeFormat('ar-EG', {
    timeZone: 'Africa/Cairo',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${key}T12:00:00Z`));
}

type TelegramSessionRow = {
  id: string;
  description: string;
  notes: string | null;
  scheduled_date: string;
  scheduled_time: string | null;
  location_name: string;
  case_name: string | null;
  case_number: string | null;
  client_name: string | null;
  lawyer_names: string | null;
  branch_name: string | null;
};

async function getTelegramSessionRows(dateKeys: string[]): Promise<TelegramSessionRow[]> {
  return prisma.$queryRawUnsafe<TelegramSessionRow[]>(
    `SELECT
       t."id",
       t."description",
       t."notes",
       to_char(t."scheduledDate",'YYYY-MM-DD') AS "scheduled_date",
       t."scheduledTime" AS "scheduled_time",
       COALESCE(l."name",'مكان العمل غير محدد') AS "location_name",
       cr."name" AS "case_name",
       cr."number" AS "case_number",
       cr."clientName" AS "client_name",
       string_agg(DISTINCT lw."fullName",'، ' ORDER BY lw."fullName") AS "lawyer_names",
       COALESCE(b."name_ar",'المقر الرئيسي') AS "branch_name"
     FROM "tasks" t
     LEFT JOIN "locations" l ON l."id"=t."locationId"
     LEFT JOIN "case_records" cr ON cr."id"=t."caseId"
     LEFT JOIN "task_assignments" ta ON ta."taskId"=t."id"
     LEFT JOIN "lawyers" lw ON lw."id"=ta."lawyerId"
     LEFT JOIN "office_branches" b ON b."id"=COALESCE(t."branch_id",'branch_main')
     WHERE t."scheduledDate" IN (
       SELECT x::date FROM unnest($1::text[]) AS x
     )
       AND t."status" IN ('PENDING','IN_PROGRESS')
     GROUP BY t."id", l."name", cr."name", cr."number", cr."clientName", b."name_ar"
     ORDER BY t."scheduledDate" ASC, t."scheduledTime" ASC NULLS LAST, t."createdAt" ASC`,
    dateKeys,
  );
}

function telegramSessionBlock(title: string, dateKey: string, rows: TelegramSessionRow[]): string {
  if (!rows.length) {
    return `<b>${escapeTelegramHtml(title)} — ${escapeTelegramHtml(prettyDate(dateKey))}</b>\nلا توجد جلسات أو تكليفات مجدولة.`;
  }

  const lines = rows.map((row, index) => {
    const when = row.scheduled_time ? escapeTelegramHtml(row.scheduled_time) : 'بدون وقت محدد';
    const caseLabel = row.case_name
      ? `<b>القضية:</b> ${escapeTelegramHtml(row.case_name + (row.case_number ? ` — ${row.case_number}` : ''))}`
      : '';
    const lawyerLabel = row.lawyer_names
      ? `<b>المحامي:</b> ${escapeTelegramHtml(row.lawyer_names)}`
      : '';
    const clientLabel = row.client_name
      ? `<b>العميل:</b> ${escapeTelegramHtml(row.client_name)}`
      : '';
    return [
      `<b>${index + 1}. ${when}</b> — ${escapeTelegramHtml(row.description)}`,
      `<b>المكان:</b> ${escapeTelegramHtml(row.location_name)}`,
      `<b>الفرع:</b> ${escapeTelegramHtml(row.branch_name ?? 'المقر الرئيسي')}`,
      caseLabel,
      clientLabel,
      lawyerLabel,
    ].filter(Boolean).join('\n');
  });

  return `<b>${escapeTelegramHtml(title)} — ${escapeTelegramHtml(prettyDate(dateKey))}</b>\n\n${lines.join('\n\n')}`;
}

async function sendTelegramDailySummary(todayKey: string) {
  if (!isTelegramConfigured()) return { skipped: 'telegram-not-configured' };

  const marker = await prisma.adminSetting.findUnique({ where: { key: TELEGRAM_DAILY_KEY } }).catch(() => null);
  if (marker?.value === todayKey) return { skipped: 'already-sent', date: todayKey };

  const dateKeys = [todayKey, 7, 14, 30].map((value) => typeof value === 'number' ? shiftDateKey(todayKey, value) : value);
  const rows = await getTelegramSessionRows(dateKeys);
  const groups = new Map(dateKeys.map((key) => [key, [] as TelegramSessionRow[]]));
  for (const row of rows) groups.get(row.scheduled_date)?.push(row);

  const message = [
    '<b>🌙 ملخص مواعيد مكتب لوتفي</b>',
    `<b>اليوم:</b> ${escapeTelegramHtml(prettyDate(todayKey))}`,
    '',
    telegramSessionBlock('📅 مواعيد اليوم', todayKey, groups.get(todayKey) ?? []),
    '',
    telegramSessionBlock('⏰ تذكير بعد أسبوع', shiftDateKey(todayKey, 7), groups.get(shiftDateKey(todayKey, 7)) ?? []),
    '',
    telegramSessionBlock('⏰ تذكير بعد أسبوعين', shiftDateKey(todayKey, 14), groups.get(shiftDateKey(todayKey, 14)) ?? []),
    '',
    telegramSessionBlock('⏰ تذكير بعد شهر', shiftDateKey(todayKey, 30), groups.get(shiftDateKey(todayKey, 30)) ?? []),
    '',
    '<a href="' + appOrigin() + '/calendar">فتح التقويم</a>',
  ].join('\n');

  try {
    await prisma.adminSetting.create({ data: { key: TELEGRAM_DAILY_KEY, value: todayKey } });
  } catch (error) {
    const existing = await prisma.adminSetting.findUnique({ where: { key: TELEGRAM_DAILY_KEY } }).catch(() => null);
    if (existing?.value === todayKey) return { skipped: 'already-sent', date: todayKey };
    await prisma.adminSetting.delete({ where: { key: TELEGRAM_DAILY_KEY } }).catch(() => undefined);
    throw error;
  }

  try {
    await sendTelegramGroupNotification(message);
    return { sent: true, date: todayKey, sessions: rows.length };
  } catch (error) {
    await prisma.adminSetting.delete({ where: { key: TELEGRAM_DAILY_KEY } }).catch(() => undefined);
    throw error;
  }
}

async function sendEmailReminders() {
  if (!isMailConfigured()) return { skipped: 'smtp-not-configured', sent: 0 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
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
    const daysLeft = Math.round((new Date(scheduled).setHours(0, 0, 0, 0) - today.getTime()) / 86400000);
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

  return { sent, candidates: tasks.length, window: window?.kind ?? 'morning', errors };
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const todayKey = cairoDateKey();
  const telegramEnabled = isTelegramConfigured();
  const dailyAtMidnight = new Date().getUTCHours() >= 21;

  const [telegram, email] = await Promise.all([
    dailyAtMidnight ? sendTelegramDailySummary(todayKey).catch((error) => ({ error: String(error?.message ?? error) })) : Promise.resolve({ skipped: 'not-daily-run' }),
    sendEmailReminders().catch((error) => ({ error: String(error?.message ?? error) })),
  ]);

  return NextResponse.json({
    ok: true,
    telegram,
    telegramConfigured: telegramEnabled,
    email,
  });
}
