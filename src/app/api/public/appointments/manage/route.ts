import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { sendTelegramGroupNotification } from '@/lib/telegram';
import {
  SLOT_CONFLICT_SQL,
  cairoToday,
  publicBranchIsActive,
  publicSecretOk,
  slotHour,
  slotsForDate,
} from '@/lib/public-booking';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type AppointmentRow = {
  id: string;
  status: string;
  date: string | null;
  time: string | null;
  type: string;
  branch_id: string | null;
  mode: string | null;
};

async function load(submissionId: string): Promise<AppointmentRow | undefined> {
  const rows = await prisma.$queryRawUnsafe<AppointmentRow[]>(
    `SELECT "id","status",to_char("appointment_date",'YYYY-MM-DD') AS date,
            "appointment_time" AS time,"appointment_type" AS type,"branch_id","mode"
       FROM "client_appointments"
      WHERE "source_submission_id" = $1
      LIMIT 1`,
    submissionId,
  );
  return rows[0];
}

async function notifyOffice(message: string) {
  await sendTelegramGroupNotification(message).catch((error) => {
    console.error('Public appointment manage notification failed:', error);
  });
}

const view = (row: AppointmentRow) => ({
  status: row.status,
  date: row.date,
  time: row.time,
  type: row.type,
  branchId: row.branch_id,
  mode: row.mode,
});

/** GET ?id=<submissionId>. The public site verifies its signed expiring manage token. */
export async function GET(req: Request) {
  if (!publicSecretOk(req)) return Response.json({ ok: false, error: 'غير مصرح' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id') || '';
  if (!z.string().uuid().safeParse(id).success) {
    return Response.json({ ok: false, error: 'bad request' }, { status: 400 });
  }

  const row = await load(id);
  if (!row) return Response.json({ ok: false, error: 'not found' }, { status: 404 });
  return Response.json({ ok: true, appointment: view(row) });
}

const bodySchema = z.object({
  id: z.string().uuid(),
  action: z.enum(['cancel', 'reschedule']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  note: z.string().trim().max(500).optional(),
});

export async function POST(req: Request) {
  if (!publicSecretOk(req)) return Response.json({ ok: false, error: 'غير مصرح' }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, error: 'bad request' }, { status: 400 });

  const data = parsed.data;
  const row = await load(data.id);
  if (!row) return Response.json({ ok: false, error: 'not found' }, { status: 404 });
  if (row.status === 'CANCELLED') {
    return Response.json({ ok: false, error: 'تم إلغاء هذا الطلب بالفعل' }, { status: 409 });
  }

  if (data.action === 'cancel') {
    const changed = await prisma.$executeRawUnsafe(
      `UPDATE "client_appointments"
          SET "status"='CANCELLED',
              "notes" = COALESCE("notes",'') || E'\n[إلغاء من العميل عبر الموقع]',
              "updated_at"=NOW()
        WHERE "id"=$1 AND "status" <> 'CANCELLED'`,
      row.id,
    );
    if (changed === 0) {
      return Response.json({ ok: false, error: 'تم إلغاء هذا الطلب بالفعل' }, { status: 409 });
    }

    await notifyOffice(
      `❌ <b>العميل ألغى طلب موعد من الموقع</b>\nالموعد: ${row.date || '-'} ${row.time || ''}\nرقم الطلب: ${row.id.slice(-6)}`,
    );
    return Response.json({ ok: true, appointment: { ...view(row), status: 'CANCELLED' } });
  }

  if (!data.date || !data.time) {
    return Response.json({ ok: false, error: 'حدد التاريخ والوقت' }, { status: 400 });
  }
  if (
    data.date < cairoToday()
    || !row.branch_id
    || !(await publicBranchIsActive(row.branch_id))
    || !slotsForDate(data.date, row.branch_id).includes(data.time)
  ) {
    return Response.json({ ok: false, error: 'هذا الموعد غير متاح' }, { status: 409 });
  }

  const note = `[طلب تغيير موعد من العميل: ${data.date} ${data.time}${data.note ? ' - ' + data.note : ''}]`;
  if (row.status === 'PENDING') {
    try {
      const updated = await prisma.$transaction(async (tx) => {
        await tx.$queryRawUnsafe(
          'SELECT pg_advisory_xact_lock(hashtext($1))',
          `slot:${row.branch_id}:${data.date}`,
        );
        const clash = await tx.$queryRawUnsafe<unknown[]>(
          SLOT_CONFLICT_SQL,
          row.branch_id,
          data.date,
          slotHour(data.time),
          row.id,
        );
        if (clash[0]) throw new Error('SLOT_TAKEN');

        return tx.$executeRawUnsafe(
          `UPDATE "client_appointments"
              SET "appointment_date"=$2::date,
                  "appointment_time"=$3,
                  "notes" = COALESCE("notes",'') || E'\n' || $4,
                  "reminder_sent_at"=NULL,
                  "updated_at"=NOW()
            WHERE "id"=$1 AND "status"='PENDING'`,
          row.id,
          data.date,
          data.time,
          note,
        );
      });
      if (updated === 0) return Response.json({ ok: false, error: 'تعذر تحديث الطلب؛ أعد المحاولة' }, { status: 409 });
    } catch (error) {
      const message = String((error as Error)?.message || error);
      if (message.includes('SLOT_TAKEN') || message.includes('client_appointments_slot_live_key')) {
        return Response.json({ ok: false, error: 'هذا الموعد غير متاح' }, { status: 409 });
      }
      throw error;
    }

    await notifyOffice(
      `🔁 <b>العميل طلب تغيير موعده المبدئي</b>\nالجديد: ${data.date} ${data.time}\nرقم الطلب: ${row.id.slice(-6)}`,
    );
    return Response.json({ ok: true, appointment: { ...view(row), date: data.date, time: data.time } });
  }

  // A confirmed appointment is not moved by a customer request; the office must review it.
  await prisma.$executeRawUnsafe(
    `UPDATE "client_appointments"
        SET "notes" = COALESCE("notes",'') || E'\n' || $2, "updated_at"=NOW()
      WHERE "id"=$1`,
    row.id,
    note,
  );
  await notifyOffice(
    `🔁 <b>العميل طلب تغيير موعد مؤكد</b>\nالمطلوب: ${data.date} ${data.time}\nرقم الطلب: ${row.id.slice(-6)}`,
  );
  return Response.json({ ok: true, appointment: view(row), requested: true });
}
