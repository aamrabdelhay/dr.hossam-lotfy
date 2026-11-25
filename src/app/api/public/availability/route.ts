import { prisma } from '@/lib/prisma';
import {
  bookingConfigured,
  cairoToday,
  publicBranchIsActive,
  publicSecretOk,
  slotHour,
  slotsForDate,
} from '@/lib/public-booking';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** GET ?date=YYYY-MM-DD&branch=<office_branches.id> -> available hourly slots. */
export async function GET(req: Request) {
  if (!publicSecretOk(req)) return Response.json({ ok: false, error: 'غير مصرح' }, { status: 401 });

  const url = new URL(req.url);
  const date = url.searchParams.get('date') || '';
  const branch = url.searchParams.get('branch')?.trim() || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !branch || branch.length > 128) {
    return Response.json({ ok: false, error: 'bad request' }, { status: 400 });
  }

  // Fail closed: unconfigured days/hours/branches mean no slots, never assumed defaults.
  if (!bookingConfigured(branch)) return Response.json({ ok: true, slots: [] });
  if (!(await publicBranchIsActive(branch))) {
    return Response.json({ ok: false, error: 'الفرع غير متاح للحجز' }, { status: 404 });
  }
  if (date < cairoToday()) return Response.json({ ok: true, slots: [] });

  const taken = await prisma.$queryRawUnsafe<Array<{ t: string | null }>>(
    `SELECT "appointment_time" AS t
       FROM "client_appointments"
      WHERE ("branch_id" = $1 OR "branch_id" IS NULL)
        AND "appointment_date" = $2::date
        AND "status" <> 'CANCELLED'`,
    branch,
    date,
  );
  const busy = new Set(taken.map((row) => slotHour(row.t)));
  const slots = slotsForDate(date, branch).filter((slot) => !busy.has(slotHour(slot)));
  return Response.json({ ok: true, slots });
}
