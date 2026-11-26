import { ApiError, actorOf, handle, json, readJson } from '@/lib/api';
import { isSeniorManagement } from '@/lib/office-workflow';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
export const dynamic = 'force-dynamic';
const body = z.object({ phase: z.enum(['IN', 'OUT']), lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180), accuracy: z.number().min(0).max(100000).optional(), consent: z.literal(true) });
/** Location proof for the lawyer's own attendance record (item 227). Per-use consent: the request must carry consent:true from a tap, and one proof is allowed per record and phase. Nothing is read in the background. Court arrival taps (item 102) never use location. Read access (proposed): the lawyer for their own rows, senior management for all. */
export const POST = handle(async (req: Request) => {
  const s = await actorOf(); if (s.role !== 'lawyer') throw new ApiError(403, 'التسجيل لحساب المحامي فقط');
  const b = await readJson(req, body);
  const [a] = await prisma.$queryRawUnsafe<{ id: string }[]>(`SELECT "id" FROM "office_staff_attendance" WHERE "lawyer_id"=$1 AND ${b.phase === 'IN' ? '"day"=CURRENT_DATE' : '"out_at" IS NOT NULL AND "day">=CURRENT_DATE-1'} ORDER BY "in_at" DESC LIMIT 1`, s.lawyerId);
  if (!a) throw new ApiError(409, 'سجل الحضور أو الانصراف أولًا ثم أرفق الموقع');
  const n = await prisma.$executeRawUnsafe(`INSERT INTO "office_attendance_location_proofs"("id","attendance_id","lawyer_id","phase","lat","lon","accuracy_m") VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`, 'alp_' + crypto.randomUUID().replaceAll('-', ''), a.id, s.lawyerId, b.phase, b.lat, b.lon, b.accuracy ?? null);
  if (!n) throw new ApiError(409, 'الموقع مرفق بالفعل لهذا التسجيل');
  return json({ ok: true }, { status: 201 });
});
export const GET = handle(async () => {
  const s = await actorOf(); const senior = await isSeniorManagement(s);
  if (!senior && s.role !== 'lawyer') throw new ApiError(403, 'غير مسموح');
  const rows = await prisma.$queryRawUnsafe(`SELECT p."attendance_id", p."phase", p."lat", p."lon", p."accuracy_m", p."consented_at", l."fullName" AS name FROM "office_attendance_location_proofs" p JOIN "lawyers" l ON l."id"=p."lawyer_id" WHERE ($1::boolean OR p."lawyer_id"=$2) ORDER BY p."consented_at" DESC LIMIT 200`, senior, s.role === 'lawyer' ? s.lawyerId : '');
  return json({ proofs: rows, scope: senior ? 'all' : 'own' });
});
