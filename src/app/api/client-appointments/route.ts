import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { user, requirePermission } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { getBranchScope } from '@/lib/branch-access';
import { sendTelegramGroupNotification } from '@/lib/telegram';

const createSchema = z.object({
  clientId: z.string().trim().min(1),
  date: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/),
  time: z.string().regex(/^\\d{2}:\\d{2}$/),
  type: z.string().trim().min(1).max(200).default('LEGAL_CONSULTATION'),
});

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

export async function POST(req: Request) {
  const session = await user();
  if (!session) return NextResponse.json({ error: 'يجب تسجيل الدخول' }, { status: 401 });
  await requirePermission('viewAdmin');

  const data = createSchema.parse(await req.json());
  const currentUser = await getCurrentUser();
  const scope = await getBranchScope(currentUser);
  const branchId = !scope.allBranches && scope.officeManager ? scope.officeManagerBranchIds[0] : null;

  const clients = await prisma.$queryRawUnsafe<Array<{ id: string; name: string; phone: string | null; branch_id: string | null; status: string | null }>>(
    'SELECT "id","name","phone","branch_id","status" FROM "clients" WHERE "id"=$1 LIMIT 1',
    data.clientId
  );
  const client = clients[0];
  if (!client || client.status === 'DELETED' || client.status === 'REJECTED') {
    return NextResponse.json({ error: 'العميل غير موجود أو مؤرشف' }, { status: 404 });
  }
  if (branchId && (client.branch_id || 'branch_main') !== branchId) {
    return NextResponse.json({ error: 'ليس لديك صلاحية تحديد موعد لهذا العميل' }, { status: 403 });
  }

  const appointmentId = 'apt_' + crypto.randomUUID().replaceAll('-', '');
  const submissionId = crypto.randomUUID();
  await prisma.$executeRawUnsafe(
    'INSERT INTO "client_appointments" ("id","client_id","source_submission_id","appointment_date","appointment_time","appointment_type","notes","status") VALUES ($1,$2,$3,$4::date,$5,$6,$7,\'CONFIRMED\')',
    appointmentId, data.clientId, submissionId, data.date, data.time, data.type, 'تم تحديد الموعد من قائمة العملاء.'
  );

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
  ].filter(Boolean).join('\\n');
  await sendTelegramGroupNotification(message).catch((error) => {
    console.error('Client appointment Telegram notification failed:', error);
  });

  return NextResponse.json({ ok: true, appointmentId, clientId: data.clientId, date: data.date, time: data.time, status: 'CONFIRMED' }, { status: 201 });
}
