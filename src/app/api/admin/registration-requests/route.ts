import { z } from 'zod';
import { handle, json, readJson, user } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { isSeniorManagement } from '@/lib/office-workflow';

/**
 * Queue for first-time lawyer registrations.
 * Only senior management may view or decide these requests.
 */
export const GET = handle(async () => {
  const session = await user();
  if (!session || !(await isSeniorManagement(session))) {
    return json({ error: 'عرض طلبات التسجيل متاح للإدارة العليا فقط.' }, { status: 403 });
  }

  const requests = await prisma.$queryRawUnsafe<Array<{
    id: string;
    fullName: string;
    title: string;
    phone: string | null;
    email: string | null;
    specialization: string | null;
    createdAt: Date;
    branchName: string | null;
  }>>(
    `SELECT
       l."id",
       l."fullName",
       l."title",
       l."phone",
       COALESCE(l."googleEmail", l."email") AS "email",
       l."specialization",
       l."createdAt",
       b."name_ar" AS "branchName"
     FROM "lawyers" l
     LEFT JOIN LATERAL (
       SELECT ob."name_ar"
       FROM "office_branch_lawyers" bl
       INNER JOIN "office_branches" ob ON ob."id" = bl."branch_id"
       WHERE bl."lawyer_id" = l."id"
       ORDER BY ob."is_main" DESC, ob."name_ar" ASC
       LIMIT 1
     ) b ON TRUE
     WHERE l."approvedAt" IS NULL AND l."active" = TRUE
     ORDER BY l."createdAt" ASC`,
  );

  return json({ requests });
});

/** Reject a pending registration without deleting the application or its audit trail. */
export const POST = handle(async (req: Request) => {
  const session = await user();
  if (!session || !(await isSeniorManagement(session))) {
    return json({ error: 'رفض طلبات التسجيل متاح للإدارة العليا فقط.' }, { status: 403 });
  }

  const data = await readJson(req, z.object({
    action: z.literal('reject'),
    lawyerId: z.string().min(1),
  }));
  const lawyer = await prisma.lawyer.findUnique({ where: { id: data.lawyerId } });
  if (!lawyer) return json({ error: 'طلب التسجيل غير موجود.' }, { status: 404 });
  if (lawyer.approvedAt) return json({ error: 'لا يمكن رفض حساب تم اعتماده بالفعل.' }, { status: 409 });
  if (!lawyer.active) return json({ ok: true, alreadyRejected: true });

  const rejected = await prisma.lawyer.update({
    where: { id: lawyer.id },
    data: { active: false },
  });
  await logActivity({
    action: 'LAWYER_REGISTRATION_REJECTED',
    summary: `رفض طلب تسجيل المحامي: ${rejected.fullName}`,
    lawyerId: rejected.id,
    byUserId: session.role === 'admin' ? session.userId : undefined,
    byLawyerId: session.role === 'lawyer' ? session.lawyerId : undefined,
  });

  return json({ ok: true, rejected: { id: rejected.id } });
});
