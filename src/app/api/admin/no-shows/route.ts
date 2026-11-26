import { z } from 'zod';
import { ApiError, actorOf, handle, json, readJson, requirePermission } from '@/lib/api';
import { markNoShow, noShowHistory } from '@/lib/office-ops';
export const dynamic = 'force-dynamic';
export const GET = handle(async (req: Request) => { await requirePermission('viewAdmin'); const s = await actorOf(); const h = await noShowHistory(s, new URL(req.url).searchParams.get('clientId') || ''); if (!h) throw new ApiError(404, 'not found'); return json({ count: h.length, history: h }); });
export const POST = handle(async (req: Request) => { await requirePermission('viewAdmin'); const s = await actorOf(); const b = await readJson(req, z.object({ appointmentId: z.string().min(1), note: z.string().max(300).optional() })); const r = await markNoShow(s, b.appointmentId, b.note); const e = (r as { error?: string }).error; if (e) throw new ApiError(e === 'wrong-branch' ? 403 : e === 'future-appointment' ? 400 : 404, e); return json({ ok: true }, { status: 201 }); });
