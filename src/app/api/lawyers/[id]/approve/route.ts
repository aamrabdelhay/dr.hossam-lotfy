import { handle, json, user } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { notifyLawyerApproved } from '@/lib/mail';
import { appOrigin } from '@/lib/google-oauth';
import { isSeniorManagement } from '@/lib/office-workflow';
import { escapeTelegramHtml, sendTelegramGroupNotification } from '@/lib/telegram';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Approve a self-registered lawyer. Only then can they sign in with the
 * existing lawyer login flow and publish/edit their own tasks. The lawyer is
 * notified by e-mail when mail delivery is configured.
 */
export const POST = handle(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const session = await user();
  if (!session || !(await isSeniorManagement(session))) {
    return json({ error: 'اعتماد طلبات الانضمام متاح للإدارة العليا فقط.' }, { status: 403 });
  }

  const lawyer = await prisma.lawyer.findUnique({ where: { id } });
  if (!lawyer) return json({ error: 'المحامي غير موجود' }, { status: 404 });

  if (lawyer.approvedAt) {
    return json({ ok: true, alreadyApproved: true, lawyer: { id: lawyer.id, fullName: lawyer.fullName } });
  }

  const updated = await prisma.lawyer.update({
    where: { id },
    data: { approvedAt: new Date(), active: true },
  });

  await logActivity({
    action: 'LAWYER_APPROVED',
    summary: `اعتمد المحامي: ${updated.fullName}`,
    lawyerId: updated.id,
    byUserId: session.role === 'admin' ? session.userId : undefined,
    byLawyerId: session.role === 'lawyer' ? session.lawyerId : undefined,
  });

  // Prefer the private Gmail login identity, but fall back to the stored
  // contact e-mail so an approved application is never skipped just because
  // googleEmail was not populated.
  const recipient = updated.googleEmail ?? updated.email;
  if (recipient) {
    await notifyLawyerApproved(recipient, updated.fullName, appOrigin());
  }

  await sendTelegramGroupNotification([
    '<b>✅ اعتماد محامٍ جديد</b>',
    '',
    '<b>الاسم:</b> ' + escapeTelegramHtml(updated.fullName),
    '<b>البريد:</b> ' + escapeTelegramHtml(recipient ?? 'غير محدد'),
    updated.phone ? '<b>الهاتف:</b> ' + escapeTelegramHtml(updated.phone) : null,
    '<b>اعتماد بواسطة:</b> ' + escapeTelegramHtml(session.name),
    '',
    '<a href="' + appOrigin() + '/admin/office">فتح الإدارة</a>',
  ].filter(Boolean).join('\n')).catch((error) => {
    console.error('Lawyer approval Telegram notification failed:', error);
  });

  return json({ ok: true, lawyer: { id: updated.id, fullName: updated.fullName }, mailRecipient: recipient ?? null });
});
