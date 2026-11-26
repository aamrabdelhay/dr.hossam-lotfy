import { z } from 'zod';
import { ApiError, handle, json, readJson, user } from '@/lib/api';
import { getChecklist, toggleChecklist } from '@/lib/office-ops';
export const dynamic = 'force-dynamic';
async function me() { const s = await user(); if (!s) throw new ApiError(401, 'يجب تسجيل الدخول'); return s; }
export const GET = handle(async (req: Request) => { const s = await me(); const id = new URL(req.url).searchParams.get('taskId') || ''; const items = await getChecklist(s, id); if (!items) throw new ApiError(404, 'غير موجود'); return json({ items }); });
export const PATCH = handle(async (req: Request) => { const s = await me(); const b = await readJson(req, z.object({ itemId: z.string().min(1), done: z.boolean() })); if (!(await toggleChecklist(s, b.itemId, b.done))) throw new ApiError(404, 'غير موجود'); return json({ ok: true }); });
