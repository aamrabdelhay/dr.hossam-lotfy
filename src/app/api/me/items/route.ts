import { z } from 'zod';
import { ApiError, handle, json, readJson, user } from '@/lib/api';
import * as pw from '@/lib/personal-workspace';
export const dynamic = 'force-dynamic';
async function me() { const s = await user(); if (!s) throw new ApiError(401, 'يجب تسجيل الدخول'); return s; }
export const GET = handle(async () => json({ items: await pw.listItems(await me()) }));
export const POST = handle(async (req: Request) => { const s = await me(); await pw.touchItem(s, await readJson(req, pw.itemSchema)); return json({ ok: true }, { status: 201 }); });
export const DELETE = handle(async (req: Request) => { const s = await me(); const { id } = await readJson(req, z.object({ id: z.string().min(1) })); await pw.removeItem(s, id); return json({ ok: true }); });
