import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { user } from '@/lib/api';
import { sendTelegramGroupNotification } from '@/lib/telegram';

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await user();
  if (!session) return NextResponse.json({ error: 'يجب تسجيل الدخول' }, { status: 401 });

  const data = schema.parse(await req.json());
  const { id } = await params;
  const rows = await prisma.$queryRawUnsafe<Array<{
    id: string; name: string; phone: string | null; appointment_type: string;
  }>>(
    'SELECT a."id", c."name", c."phone", a."appointment_type" FROM "client_appointments" a JOIN "clients" c ON c."id"=a."client_id" WHERE a."id"=$1 LIMIT 1',
    id
  );
  if (!rows[0]) return NextResponse.json({ error: 'طلب الموعد غير موجود' }, { status: 404 });

  await prisma.$executeRawUnsafe(
    'UPDATE "client_appointments" SET "appointment_date"=$2::date,"appointment_time"=$3,"status"=\'CONFIRMED\',"updated_at"=NOW() WHERE "id"=$1',
    id, data.date, data.time
  );

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
  await sendTelegramGroupNotification(message).catch(() => undefined);

  return NextResponse.json({ ok: true, date: data.date, time: data.time, status: 'CONFIRMED' });
}
