import { z } from 'zod';
import { ApiError, handle, json, readJson, user } from '@/lib/api';
import * as pw from '@/lib/personal-workspace';
export const dynamic = 'force-dynamic';
async function me() { const s = await user(); if (!s) throw new ApiError(401, 'يجب تسجيل الدخول'); return s; }
export const GET = handle(async () => json({ entries: await pw.listUndo(await me()) }));
export const POST = handle(async (req: Request) => { const s = await me(); const { id } = await readJson(req, z.object({ id: z.string().min(1) })); const r = await pw.applyUndo(s, id); if (!r.ok) throw new ApiError(404, 'لا يمكن التراجع: انتهت المهلة أو تم التراجع بالفعل'); return json({ ok: true }); });
