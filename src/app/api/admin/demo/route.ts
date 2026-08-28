import { z } from 'zod';
import { handle, json, readJson, requireAdmin } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { clearDemoData, getDemoStatus, restoreDemoData } from '@prisma-support/demo-data';

export const dynamic = 'force-dynamic';
// Wiping/restoring touches every operational table — give it room to finish.
export const maxDuration = 60;

/** Current data counts, so the admin UI can label the button honestly. */
export const GET = handle(async () => {
  await requireAdmin();
  return json(await getDemoStatus());
});

const bodySchema = z.object({
  action: z.enum(['clear', 'restore'], { message: 'الإجراء غير معروف' }),
  /** Explicit confirmation — prevents an accidental one-click wipe. */
  confirm: z.literal(true, { message: 'التأكيد مطلوب قبل تنفيذ هذا الإجراء' }),
});

/**
 * Destructive, SUPER_ADMIN-only maintenance endpoint.
 *
 * `clear`   → remove all test/operational data so the office can go live.
 * `restore` → recreate the deterministic demo dataset for experimenting.
 *
 * Staff accounts and the legal-locations directory are always preserved.
 */
export const POST = handle(async (req: Request) => {
  const session = await requireAdmin();
  const { action } = await readJson(req as never, bodySchema);

  if (action === 'clear') {
    const before = await clearDemoData();
    await logActivity({
      action: 'DELETED',
      summary: `مسح بيانات الاختبار (${before.tasks} مهمة، ${before.cases} قضية، ${before.lawyers} محامٍ) — ${session.name}`,
      byUserId: session.userId,
    }).catch(() => undefined);
    return json({
      ok: true,
      action,
      message: 'تم مسح كل بيانات الاختبار. الموقع جاهز للتشغيل الفعلي.',
      removed: before,
      status: await getDemoStatus(),
    });
  }

  const counts = await restoreDemoData();
  await logActivity({
    action: 'CREATED',
    summary: `استرجاع بيانات الاختبار — ${session.name}`,
    byUserId: session.userId,
  }).catch(() => undefined);
  return json({
    ok: true,
    action,
    message: 'تم استرجاع بيانات الاختبار.',
    status: { demoPresent: true, counts },
  });
});
