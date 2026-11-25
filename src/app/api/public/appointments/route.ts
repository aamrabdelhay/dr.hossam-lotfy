import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { sendTelegramGroupNotification } from '@/lib/telegram';
import {
  PUBLIC_MODES,
  SLOT_CONFLICT_SQL,
  cairoToday,
  publicBranchIsActive,
  publicSecretOk,
  slotHour,
  slotsForDate,
} from '@/lib/public-booking';

const schema = z.object({
  submissionId: z.string().uuid(),
  name: z.string().trim().min(2).max(300),
  phone: z.string().trim().min(3).max(100),
  email: z.string().trim().email().max(200).optional().or(z.literal('')),
  date: z.string().optional().or(z.literal('')),
  time: z.string().optional().or(z.literal('')),
  type: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(4000).optional(),
  branchId: z.string().trim().min(1).max(128).optional(),
  mode: z.enum(PUBLIC_MODES).optional(),
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

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return Response.json({ ok: false, error: 'بيانات الطلب غير صالحة' }, { status: 400 });
    const data = parsed.data;

    // Idempotent retries return the original appointment even if office hours changed afterwards.
    const existing = await prisma.$queryRawUnsafe<Array<{ id: string; client_id: string }>>(
      'SELECT "id", "client_id" FROM "client_appointments" WHERE "source_submission_id" = $1 LIMIT 1',
      data.submissionId,
    );
    if (existing[0]) {
      return Response.json({ ok: true, appointmentId: existing[0].id, clientId: existing[0].client_id });
    }

    // Requests without a branch preserve the legacy plain-request flow (no reserved slot).
    const wantsSlot = Boolean(data.branchId);
    if (wantsSlot) {
      if (!data.date || !data.time || !/^\d{4}-\d{2}-\d{2}$/.test(data.date) || !/^\d{2}:\d{2}$/.test(data.time)) {
        return Response.json({ ok: false, error: 'حدد الفرع والتاريخ والوقت للحجز' }, { status: 409 });
      }
      if (
        data.date < cairoToday()
        || !(await publicBranchIsActive(data.branchId!))
        || !slotsForDate(data.date, data.branchId).includes(data.time)
      ) {
        return Response.json({ ok: false, error: 'هذا الموعد غير متاح' }, { status: 409 });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const duplicate = await tx.$queryRawUnsafe<Array<{ id: string; client_id: string }>>(
        'SELECT "id", "client_id" FROM "client_appointments" WHERE "source_submission_id" = $1 LIMIT 1',
        data.submissionId,
      );
      if (duplicate[0]) {
        return { appointmentId: duplicate[0].id, clientId: duplicate[0].client_id, created: false };
      }

      if (wantsSlot) {
        const active = await tx.$queryRawUnsafe<Array<{ id: string }>>(
          'SELECT "id" FROM "office_branches" WHERE "id"=$1 AND "active"=true LIMIT 1',
          data.branchId!,
        );
        if (!active[0]) throw new Error('SLOT_UNAVAILABLE');

        await tx.$queryRawUnsafe(
          'SELECT pg_advisory_xact_lock(hashtext($1))',
          `slot:${data.branchId}:${data.date}`,
        );
        const clash = await tx.$queryRawUnsafe<unknown[]>(
          SLOT_CONFLICT_SQL,
          data.branchId!,
          data.date!,
          slotHour(data.time),
          null,
        );
        if (clash[0]) throw new Error('SLOT_TAKEN');
      }

      const matching = await tx.$queryRawUnsafe<Array<{ id: string; status: string }>>(
        'SELECT "id","status" FROM "clients" WHERE "phone" = $1 OR ($2 <> \'\' AND lower(COALESCE("email",\'\')) = lower($2)) ORDER BY CASE WHEN "phone" = $1 THEN 0 ELSE 1 END, "createdAt" ASC LIMIT 1',
        data.phone,
        data.email || '',
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
          data.notes || 'تم إنشاء الطلب من الموقع العام.',
        );
      } else {
        await tx.$executeRawUnsafe(
          'UPDATE "clients" SET "name" = CASE WHEN COALESCE("name",\'\') = \'\' THEN $2 ELSE "name" END, "email" = COALESCE(NULLIF("email",\'\'), NULLIF($3,\'\')), "updatedAt" = NOW() WHERE "id" = $1',
          clientId,
          data.name,
          data.email || '',
        );
      }

      const appointmentId = 'apt_' + crypto.randomUUID().replaceAll('-', '');
      await tx.$executeRawUnsafe(
        'INSERT INTO "client_appointments" ("id","client_id","source_submission_id","appointment_date","appointment_time","appointment_type","notes","status","branch_id","mode") VALUES ($1,$2,$3,$4::date,$5,$6,$7,\'PENDING\',$8,$9)',
        appointmentId,
        clientId,
        data.submissionId,
        data.date || null,
        data.time || null,
        data.type,
        data.notes || null,
        data.branchId || null,
        data.mode || null,
      );
      return { appointmentId, clientId, created: true };
    });

    if (result.created) {
      const typeLabels: Record<string, string> = {
        LEGAL_CONSULTATION: 'استشارة قانونية',
        CASE_FOLLOW_UP: 'متابعة ملف',
        OTHER: 'أخرى',
      };
      const appointmentType = typeLabels[data.type] || data.type;
      const telegramMessage = [
        '🔔 <b>طلب موعد جديد</b>',
        '',
        '👤 <b>الاسم:</b> ' + escapeHtml(data.name),
        '📱 <b>الهاتف:</b> ' + escapeHtml(data.phone),
        data.email ? '📧 <b>البريد:</b> ' + escapeHtml(data.email) : null,
        '⚖️ <b>نوع الطلب:</b> ' + escapeHtml(appointmentType),
        data.branchId ? '🏢 <b>الفرع:</b> ' + escapeHtml(data.branchId) : null,
        data.date ? '📅 <b>التاريخ:</b> ' + escapeHtml(data.date) : null,
        data.time ? '🕕 <b>الوقت:</b> ' + escapeHtml(data.time) : null,
        data.notes ? '📝 <b>الملاحظات:</b> ' + escapeHtml(data.notes) : null,
      ].filter(Boolean).join('\n');
      await sendTelegramGroupNotification(telegramMessage).catch((error) => {
        console.error('Appointment Telegram notification failed:', error);
      });
    }

    return Response.json({ ok: true, appointmentId: result.appointmentId, clientId: result.clientId });
  } catch (error) {
    const message = String((error as Error)?.message || error);
    if (
      message.includes('SLOT_TAKEN')
      || message.includes('SLOT_UNAVAILABLE')
      || message.includes('client_appointments_slot_live_key')
    ) {
      return Response.json({ ok: false, error: 'هذا الموعد غير متاح' }, { status: 409 });
    }
    console.error('Public appointment ingestion failed:', error);
    return Response.json({ ok: false, error: 'تعذر تسجيل الموعد حاليًا' }, { status: 400 });
  }
}
