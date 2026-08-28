import { z } from 'zod';
import { handle, json, readJson, requireAdmin } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { clearDemoData, getDemoStatus, restoreDemoData } from '@prisma-support/demo-data';
import { DEMO_COOKIE, isDemoLocked, lockDemoMode } from '@/lib/demo-mode';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const GET = handle(async () => {
  await requireAdmin();
  return json({ ...(await getDemoStatus()), demoLocked: await isDemoLocked() });
});

const bodySchema = z.object({
  action: z.enum(['clear', 'restore', 'lock'], { message: 'الإجراء غير معروف' }),
  confirm: z.literal(true, { message: 'التأكيد مطلوب قبل تنفيذ هذا الإجراء' }),
});

export const POST = handle(async (req: Request) => {
  const session = await requireAdmin();
  const { action } = await readJson(req as never, bodySchema);

  if (action === 'lock') {
    const locked = await isDemoLocked();
    if (locked) {
      return NextResponse.json({ ok: true, action, demoLocked: true, message: 'وضع التشغيل الفعلي مقفول بالفعل.' });
    }

    const before = await clearDemoData();
    await lockDemoMode();
    await logActivity({
      action: 'DELETED',
      summary: `تحويل الموقع للتشغيل الفعلي نهائياً ومسح بيانات الديمو (${before.tasks} مهمة، ${before.cases} قضية، ${before.lawyers} محامٍ) — ${session.name}`,
      byUserId: session.userId,
    }).catch(() => undefined);

    const res = NextResponse.json({
      ok: true,
      action,
      demoLocked: true,
      message: 'تم تحويل الموقع للتشغيل الفعلي نهائياً ومسح بيانات الديمو. لن يمكن تشغيل وضع الديمو مرة أخرى.',
      removed: before,
      status: await getDemoStatus(),
    });
    res.cookies.set(DEMO_COOKIE, '0', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 });
    return res;
  }

  if (await isDemoLocked()) {
    return NextResponse.json({ ok: false, error: 'وضع الديمو تم إيقافه نهائياً ولا يمكن تشغيله مرة أخرى.' }, { status: 409 });
  }

  if (action === 'clear') {
    const before = await clearDemoData();
    await logActivity({ action: 'DELETED', summary: `مسح بيانات الديمو فقط (${before.tasks} مهمة، ${before.cases} قضية، ${before.lawyers} محامٍ) — ${session.name}`, byUserId: session.userId }).catch(() => undefined);
    const res = NextResponse.json({ ok: true, action, message: 'تم مسح بيانات الديمو فقط. البيانات الحقيقية لم تُمس.', removed: before, status: await getDemoStatus(), demoLocked: false });
    res.cookies.set(DEMO_COOKIE, '0', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30 });
    return res;
  }

  const counts = await restoreDemoData();
  await logActivity({ action: 'CREATED', summary: `استرجاع بيانات الديمو — ${session.name}`, byUserId: session.userId }).catch(() => undefined);
  const res = NextResponse.json({ ok: true, action, message: 'تم تشغيل وضع الديمو. أي بيانات تشغيلية جديدة أثناء الديمو تُوسم كبيانات تجريبية ولن تُمسح البيانات الحقيقية.', status: { demoPresent: true, counts }, demoLocked: false });
  res.cookies.set(DEMO_COOKIE, '1', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30 });
  return res;
});