import { prisma } from '@/lib/prisma';
import { handle, json, user } from '@/lib/api';
import { appOrigin } from '@/lib/google-oauth';
import { isMailConfigured, officeCcRecipients, sendMail } from '@/lib/mail';

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const session = await user();
  if (!session) return json({ error: 'يجب تسجيل الدخول لتأكيد المهمة' }, { status: 401 });

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      location: true,
      caseRecord: true,
      assignees: {
        include: {
          lawyer: { select: { id: true, fullName: true, email: true, googleEmail: true, active: true } },
        },
      },
    },
  });
  if (!task) return json({ error: 'المهمة غير موجودة' }, { status: 404 });

  const isAdmin = session.role === 'admin';
  const recipients = isAdmin
    ? task.assignees.filter((a) => a.lawyer.active)
    : task.assignees.filter((a) => a.lawyer.id === session.lawyerId && a.lawyer.active);

  if (recipients.length === 0) {
    return json({ error: isAdmin ? 'لا يوجد محامون مكلّفون بهذه المهمة' : 'هذه المهمة غير مسندة إليك' }, { status: 403 });
  }

  if (!isMailConfigured()) {
    return json({ error: 'إعدادات البريد الإلكتروني غير مكتملة على الخادم' }, { status: 503 });
  }

  const principal = await prisma.lawyer.findFirst({
    where: { isPrincipal: true, active: true },
    select: { email: true, googleEmail: true },
  });
  const cc = officeCcRecipients(principal?.googleEmail ?? principal?.email ?? null);
  const taskDesc = (task.description || task.location.name).slice(0, 160);
  const caseLabel = task.caseRecord ? `${task.caseRecord.name} — ${task.caseRecord.number}` : null;
  const when = task.scheduledDate
    ? `${task.scheduledDate.toISOString().slice(0, 10)}${task.scheduledTime ? ` — ${task.scheduledTime}` : ''}`
    : 'بالتنسيق';
  const url = `${appOrigin()}/sessions/${task.id}`;

  let sent = 0;
  for (const assignment of recipients) {
    const to = (assignment.lawyer.googleEmail ?? assignment.lawyer.email)?.trim();
    if (!to) continue;
    const ok = await sendMail({
      to,
      cc,
      subject: `تأكيد المهمة — ${taskDesc} — DR. HOSSAM LOTFY LAW FIRM`,
      text: [
        `مرحباً ${assignment.lawyer.fullName}،`,
        '',
        'تم تأكيد المهمة المسندة إليك من خلال نظام إدارة المكتب.',
        '',
        `المهمة: ${taskDesc}`,
        `المكان: ${task.location.name}`,
        `الموعد: ${when}`,
        caseLabel ? `القضية: ${caseLabel}` : '',
        '',
        `التفاصيل: ${url}`,
        '',
        'DR. HOSSAM LOTFY LAW FIRM',
      ].filter(Boolean).join('\n'),
    }).then(() => true).catch((err) => {
      console.error('[tasks/confirm] mail failed:', (err as Error)?.message ?? err);
      return false;
    });
    if (ok) sent += 1;
  }

  if (sent === 0) return json({ error: 'تعذر إرسال رسالة التأكيد. تأكد من وجود بريد للمحامي وإعدادات SMTP.' }, { status: 502 });
  return json({ ok: true, sent });
});
