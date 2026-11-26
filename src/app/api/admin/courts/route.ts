import { z } from 'zod';
import { ApiError, actorOf, handle, json, readJson, requirePermission, user } from '@/lib/api';
import { deactivateCourt, listCourts, saveCourt } from '@/lib/office-ops';
export const dynamic = 'force-dynamic';
export const GET = handle(async () => { if (!(await user())) throw new ApiError(401, 'يجب تسجيل الدخول'); return json({ courts: await listCourts() }); });
export const POST = handle(async (req: Request) => { await requirePermission('writeTasks'); const s = await actorOf(); await saveCourt(s, await readJson(req, z.object({ name: z.string().min(1).max(200), city: z.string().max(100).optional(), governorate: z.string().max(100).optional() }))); return json({ ok: true }, { status: 201 }); });
export const DELETE = handle(async (req: Request) => { await requirePermission('writeTasks'); const { id } = await readJson(req, z.object({ id: z.string().min(1) })); await deactivateCourt(id); return json({ ok: true, note: 'deactivated, not deleted' }); });
