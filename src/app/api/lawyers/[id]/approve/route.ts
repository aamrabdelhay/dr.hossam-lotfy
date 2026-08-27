import { handle, json, requirePermission } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { notifyLawyerApproved } from '@/lib/mail';
import { appOrigin } from '@/lib/google-oauth';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Approve a self-registered lawyer. Only then can they sign in with Gmail and
 * publish / edit their own tasks. The lawyer is notified by e-mail.
 */
export const POST = handle(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const session = await requirePermission('manageLawyers');

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
    byUserId: session.userId,
  });

  if (updated.googleEmail) {
    await notifyLawyerApproved(updated.googleEmail, updated.fullName, appOrigin());
  }

  return json({ ok: true, lawyer: { id: updated.id, fullName: updated.fullName } });
});
