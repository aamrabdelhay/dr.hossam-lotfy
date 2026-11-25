import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isMailConfigured, trySendMail } from '@/lib/mail';
import { cairoToday } from '@/lib/public-booking';

export const dynamic = 'force-dynamic';

/** Daily: remind clients of CONFIRMED appointments happening tomorrow (Cairo). Email only. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!isMailConfigured()) {
    return NextResponse.json({ ok: true, skipped: 'mail not configured' });
  }

  const tomorrow = new Date(`${cairoToday()}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const day = tomorrow.toISOString().slice(0, 10);

  // The atomic UPDATE claim ensures overlapping cron runs cannot send the same reminder twice.
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; time: string | null; client_id: string }>>(
    `UPDATE "client_appointments" SET "reminder_sent_at" = NOW()
      WHERE "status"='CONFIRMED'
        AND "appointment_date" = $1::date
        AND "reminder_sent_at" IS NULL
        AND EXISTS (
          SELECT 1 FROM "clients" c
           WHERE c."id" = "client_appointments"."client_id"
             AND COALESCE(c."email",'') <> ''
        )
      RETURNING "id", "appointment_time" AS time, "client_id"`,
    day,
  );

  let sent = 0;
  for (const appointment of rows) {
    const client = (await prisma.$queryRawUnsafe<Array<{ email: string; name: string | null }>>(
      'SELECT "email","name" FROM "clients" WHERE "id"=$1',
      appointment.client_id,
    ))[0];

    const delivered = client ? await trySendMail({
      to: client.email,
      subject: 'تذكير بموعدك غدًا',
      text: `مرحبًا ${client.name || ''}،\nنذكرك بموعدك غدًا ${day}${appointment.time ? ' الساعة ' + appointment.time : ''}. لإلغاء الموعد أو تغييره تواصل مع المكتب.`,
    }) : false;

    if (delivered) sent += 1;
    else {
      // Release failed claims so a later cron run can retry them.
      await prisma.$executeRawUnsafe(
        'UPDATE "client_appointments" SET "reminder_sent_at"=NULL WHERE "id"=$1',
        appointment.id,
      );
    }
  }

  return NextResponse.json({ ok: true, due: rows.length, sent });
}
