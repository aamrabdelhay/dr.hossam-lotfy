import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { user } from '@/lib/api';
import { getBranchScope } from '@/lib/branch-access';
import { isSeniorManagement } from '@/lib/office-workflow';
import { sendTelegramGroupNotification } from '@/lib/telegram';
import { SLOT_CONFLICT_SQL, slotHour } from '@/lib/public-booking';

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await user();
  if (!session) return NextResponse.json({ error: 'يجب تسجيل الدخول' }, { status: 401 });

  const [scope, senior] = await Promise.all([
    getBranchScope(session),
    isSeniorManagement(session),
  ]);
  if (!senior && !scope.officeManager) {
    return NextResponse.json({ error: 'تعديل مواعيد العملاء متاح للإدارة العليا ومدير المكتب فقط' }, { status: 403 });
  }

  const data = schema.parse(await req.json());
  const { id } = await params;
  const rows = await prisma.$queryRawUnsafe<Array<{
    id: string;
    name: string;
    phone: string | null;
    appointment_type: string;
    branch_id: string | null;
  }>>(
    `SELECT a."id", c."name", c."phone",
            COALESCE(a."branch_id",c."branch_id",'branch_main') AS "branch_id",
            a."appointment_type"
       FROM "client_appointments" a
       JOIN "clients" c ON c."id"=a."client_id"
      WHERE a."id"=$1
      LIMIT 1`,
    id,
  );
  if (!rows[0]) return NextResponse.json({ error: 'طلب الموعد غير موجود' }, { status: 404 });

  const branch = rows[0].branch_id || 'branch_main';
  if (!scope.allBranches && !scope.officeManagerBranchIds.includes(branch)) {
    return NextResponse.json({ error: 'ليس لديك صلاحية تعديل موعد لعميل من هذا الفرع' }, { status: 403 });
  }

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
        id,
      );
      if (clash[0]) throw new Error('SLOT_TAKEN');

      await tx.$executeRawUnsafe(
        'UPDATE "client_appointments" SET "appointment_date"=$2::date,"appointment_time"=$3,"status"=\'CONFIRMED\',"branch_id"=$4,"reminder_sent_at"=NULL,"updated_at"=NOW() WHERE "id"=$1',
        id,
        data.date,
        data.time,
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
    'استشارة قانونية': 'استشارة قانونية',
    'متابعة ملف': 'متابعة ملف',
    'أخرى': 'أخرى',
  };
  const type = typeLabels[rows[0].appointment_type] || rows[0].appointment_type;
  const message = [
    '📌 <b>تم تحديد موعد</b>',
    '',
    '👤 <b>الاسم:</b> ' + rows[0].name,
    rows[0].phone ? '📱 <b>الهاتف:</b> ' + rows[0].phone : null,
    '⚖️ <b>نوع الموعد:</b> ' + type,
    '📅 <b>التاريخ:</b> ' + data.date,
    '🕕 <b>الوقت:</b> ' + data.time,
  ].filter(Boolean).join('\n');
  await sendTelegramGroupNotification(message).catch((error) => {
    console.error('Client appointment Telegram notification failed:', error);
  });

  return NextResponse.json({ ok: true, date: data.date, time: data.time, status: 'CONFIRMED', branchId: branch });
}
