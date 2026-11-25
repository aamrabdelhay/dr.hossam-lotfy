import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { user, requirePermission } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { getBranchScope } from '@/lib/branch-access';
import { isSeniorManagement } from '@/lib/office-workflow';
import { sendTelegramGroupNotification } from '@/lib/telegram';
import { SLOT_CONFLICT_SQL, slotHour } from '@/lib/public-booking';

const createSchema = z.object({
  clientId: z.string().trim().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  type: z.string().trim().min(1).max(200).default('LEGAL_CONSULTATION'),
});

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

export async function POST(req: Request) {
  const session = await user();
  if (!session) return NextResponse.json({ error: 'يجب تسجيل الدخول' }, { status: 401 });
  await requirePermission('viewAdmin');

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'بيانات الموعد غير صالحة' }, { status: 400 });
  const data = parsed.data;
  const currentUser = await getCurrentUser();
  const [scope, senior] = await Promise.all([
    getBranchScope(currentUser),
    isSeniorManagement(currentUser),
  ]);
  if (!senior && !scope.officeManager) {
    return NextResponse.json({ error: 'تحديد مواعيد العملاء متاح للإدارة العليا ومدير المكتب فقط' }, { status: 403 });
  }

  const clients = await prisma.$queryRawUnsafe<Array<{
    id: string;
    name: string;
    phone: string | null;
    branch_id: string | null;
    status: string | null;
  }>>(
    'SELECT "id","name","phone","branch_id","status" FROM "clients" WHERE "id"=$1 LIMIT 1',
    data.clientId,
  );
  const client = clients[0];
  if (!client || client.status === 'DELETED' || client.status === 'REJECTED') {
    return NextResponse.json({ error: 'العميل غير موجود أو مؤرشف' }, { status: 404 });
  }

  const branch = client.branch_id || 'branch_main';
  if (!scope.allBranches && !scope.officeManagerBranchIds.includes(branch)) {
    return NextResponse.json({ error: 'ليس لديك صلاحية تحديد موعد لهذا العميل أو فرعه' }, { status: 403 });
  }

  const appointmentId = 'apt_' + crypto.randomUUID().replaceAll('-', '');
  const submissionId = crypto.randomUUID();
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRawUnsafe(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        `slot:${branch}:${data.date}`,
      );
      const clash = await tx.$queryRawUnsafe<unknown[]>(
        SLOT_CONFLICT_SQL,
        branch,
        data.date,
        slotHour(data.time),
        null,
      );
      if (clash[0]) throw new Error('SLOT_TAKEN');

      await tx.$executeRawUnsafe(
        'INSERT INTO "client_appointments" ("id","client_id","source_submission_id","appointment_date","appointment_time","appointment_type","notes","status","branch_id") VALUES ($1,$2,$3,$4::date,$5,$6,$7,\'CONFIRMED\',$8)',
        appointmentId,
        data.clientId,
        submissionId,
        data.date,
        data.time,
        data.type,
        'تم تحديد الموعد من قائمة العملاء.',
        branch,
      );
    });
  } catch (error) {
    const message = String((error as Error)?.message || error);
    if (message.includes('SLOT_TAKEN') || message.includes('client_appointments_slot_live_key')) {
      return NextResponse.json({ error: 'يوجد موعد آخر في نفس الساعة بهذا الفرع' }, { status: 409 });
    }
    throw error;
  }

  const typeLabels: Record<string, string> = {
    LEGAL_CONSULTATION: 'استشارة قانونية',
    CASE_FOLLOW_UP: 'متابعة ملف',
    OTHER: 'أخرى',
  };
  const message = [
    '📌 <b>تم تحديد موعد لعميل</b>',
    '',
    '👤 <b>الاسم:</b> ' + escapeHtml(client.name),
    client.phone ? '📱 <b>الهاتف:</b> ' + escapeHtml(client.phone) : null,
    '⚖️ <b>نوع الموعد:</b> ' + escapeHtml(typeLabels[data.type] || data.type),
    '📅 <b>التاريخ:</b> ' + data.date,
    '🕕 <b>الوقت:</b> ' + data.time,
  ].filter(Boolean).join('\n');
  await sendTelegramGroupNotification(message).catch((error) => {
    console.error('Client appointment Telegram notification failed:', error);
  });

  return NextResponse.json({
    ok: true,
    appointmentId,
    clientId: data.clientId,
    date: data.date,
    time: data.time,
    status: 'CONFIRMED',
    branchId: branch,
  }, { status: 201 });
}
