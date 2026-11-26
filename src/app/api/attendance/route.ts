import { ApiError, actorOf, handle, json, readJson } from '@/lib/api';
import { isSeniorManagement } from '@/lib/office-workflow';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
export const dynamic = 'force-dynamic';
const body = z.object({ action: z.enum(['IN', 'OUT']) });
type Row = { id: string; lawyer_id: string; name: string; day: string; in_at: string; out_at: string | null };
/** Staff check-in and check-out (item 187). A lawyer taps for themselves only; no location is read. Senior management can read everyone. No lateness rule: none was supplied by the office. */
export const GET = handle(async (req: Request) => {
  const s = await actorOf(); const senior = await isSeniorManagement(s);
  if (!senior && s.role !== 'lawyer') throw new ApiError(403, 'غير مسموح');
  const sp = new URL(req.url).searchParams; const d = /^\d{4}-\d{2}-\d{2}$/;
  const from = d.test(sp.get('from') ?? '') ? sp.get('from') : null; const to = d.test(sp.get('to') ?? '') ? sp.get('to') : null;
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT a."id", a."lawyer_id", l."fullName" AS name, to_char(a."day",'YYYY-MM-DD') AS day, a."in_at", a."out_at" FROM "office_staff_attendance" a JOIN "lawyers" l ON l."id"=a."lawyer_id"
      WHERE ($1::boolean OR a."lawyer_id"=$2) AND a."day" >= COALESCE($3::date, CURRENT_DATE - 31) AND a."day" <= COALESCE($4::date, CURRENT_DATE) ORDER BY a."in_at" DESC LIMIT 500`, senior, s.role === 'lawyer' ? s.lawyerId : '', from, to);
  return json({ entries: rows, scope: senior ? 'all' : 'own' });
});
export const POST = handle(async (req: Request) => {
  const s = await actorOf(); if (s.role !== 'lawyer') throw new ApiError(403, 'التسجيل لحساب المحامي فقط');
  const { action } = await readJson(req, body);
  const [open] = await prisma.$queryRawUnsafe<{ id: string }[]>(`SELECT "id" FROM "office_staff_attendance" WHERE "lawyer_id"=$1 AND "out_at" IS NULL ORDER BY "in_at" DESC LIMIT 1`, s.lawyerId);
  if (action === 'IN') {
    if (open) throw new ApiError(409, 'يوجد حضور مفتوح بالفعل. سجل الانصراف أولًا');
    const id = 'att_' + crypto.randomUUID().replaceAll('-', '');
    await prisma.$executeRawUnsafe(`INSERT INTO "office_staff_attendance"("id","lawyer_id") VALUES ($1,$2)`, id, s.lawyerId); return json({ id }, { status: 201 });
  }
  if (!open) throw new ApiError(409, 'لا يوجد حضور مفتوح لتسجيل الانصراف');
  await prisma.$executeRawUnsafe(`UPDATE "office_staff_attendance" SET "out_at"=NOW() WHERE "id"=$1`, open.id); return json({ id: open.id });
});
