import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { sendTelegramGroupNotification } from '@/lib/telegram';

const schema = z.object({
  submissionId: z.string().uuid(),
  name: z.string().trim().min(2).max(300),
  phone: z.string().trim().min(3).max(100),
  email: z.string().trim().email().max(200).optional().or(z.literal('')),
  date: z.string().optional().or(z.literal('')),
  time: z.string().optional().or(z.literal('')),
  type: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(4000).optional(),
});

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

export async function POST(req: Request) {
  try {
    const expectedSecret = process.env.APPOINTMENT_INGEST_SECRET?.trim();
    const receivedSecret = req.headers.get('x-appointment-secret')?.trim() || '';
    if (!expectedSecret || !receivedSecret || !safeEqual(receivedSecret, expectedSecret)) {
      return Response.json({ ok: false, error: 'غير مصرح' }, { status: 401 });
    }
    const data = schema.parse(await req.json());

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.$queryRawUnsafe<Array<{ id: string; client_id: string }>>(
        'SELECT "id", "client_id" FROM "client_appointments" WHERE "source_submission_id" = $1 LIMIT 1',
        data.submissionId
      );
      if (existing[0]) return { appointmentId: existing[0].id, clientId: existing[0].client_id, created: false };

      const matching = await tx.$queryRawUnsafe<Array<{ id: string; status: string }>>(
        'SELECT "id","status" FROM "clients" WHERE "phone" = $1 OR ($2 <> \'\' AND lower(COALESCE("email",\'\')) = lower($2)) ORDER BY CASE WHEN "phone" = $1 THEN 0 ELSE 1 END, "createdAt" ASC LIMIT 1',
        data.phone,
        data.email || ''
      );

      let clientId = matching[0]?.id;
      if (!clientId) {
        clientId = 'cl_' + crypto.randomUUID().replaceAll('-', '');
        await tx.$executeRawUnsafe(
          'INSERT INTO "clients" ("id","name","phone","email","notes","status") VALUES ($1,$2,$3,$4,$5,\'POTENTIAL\')',
          clientId,
          data.name,
          data.phone,
          data.email || null,
          data.notes || 'تم إنشاء الطلب من الموقع العام.'
        );
      } else {
        await tx.$executeRawUnsafe(
          'UPDATE "clients" SET "name" = CASE WHEN COALESCE("name",\'\') = \'\' THEN $2 ELSE "name" END, "email" = COALESCE(NULLIF("email",\'\'), NULLIF($3,\'\')), "updatedAt" = NOW() WHERE "id" = $1',
          clientId,
          data.name,
          data.email || ''
        );
      }

      const appointmentId = 'apt_' + crypto.randomUUID().replaceAll('-', '');
      await tx.$executeRawUnsafe(
        'INSERT INTO "client_appointments" ("id","client_id","source_submission_id","appointment_date","appointment_time","appointment_type","notes","status") VALUES ($1,$2,$3,$4::date,$5,$6,$7,\'PENDING\')',
        appointmentId,
        clientId,
        data.submissionId,
        data.date || null,
        data.time || null,
        data.type,
        data.notes || null
      );
      return { appointmentId, clientId, created: true };
    });

    if (result.created) {
      const telegramMessage = [
        '🔔 <b>طلب موعد جديد</b>',
        '',
        '👤 <b>الاسم:</b> ' + escapeHtml(data.name),
        '📱 <b>الهاتف:</b> ' + escapeHtml(data.phone),
        data.email ? '📧 <b>البريد:</b> ' + escapeHtml(data.email) : null,
        '⚖️ <b>نوع الطلب:</b> ' + escapeHtml(data.type),
        data.notes ? '📝 <b>الملاحظات:</b> ' + escapeHtml(data.notes) : null,
      ].filter(Boolean).join('\n');
      await sendTelegramGroupNotification(telegramMessage).catch((error) => {
        console.error('Appointment Telegram notification failed:', error);
      });
    }

    return Response.json({ ok: true, appointmentId: result.appointmentId, clientId: result.clientId });
  } catch (error) {
    console.error('Public appointment ingestion failed:', error);
    return Response.json({ ok: false, error: 'تعذر تسجيل الموعد حاليًا' }, { status: 400 });
  }
}