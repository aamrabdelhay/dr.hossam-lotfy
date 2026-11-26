import { z } from 'zod';
import { ApiError, handle, json, readJson, user } from '@/lib/api';
import * as pw from '@/lib/personal-workspace';
export const dynamic = 'force-dynamic';
async function me() { const s = await user(); if (!s) throw new ApiError(401, 'يجب تسجيل الدخول'); return s; }
export const GET = handle(async (req: Request) => json({ filters: await pw.listFilters(await me(), new URL(req.url).searchParams.get('scope') || undefined) }));
export const POST = handle(async (req: Request) => { const s = await me(); try { await pw.saveFilter(s, await readJson(req, pw.filterSchema)); } catch (e) { if (e instanceof ApiError) throw e; throw new ApiError(400, 'الفلتر كبير جداً'); } return json({ ok: true }, { status: 201 }); });
export const DELETE = handle(async (req: Request) => { const s = await me(); const { id } = await readJson(req, z.object({ id: z.string().min(1) })); await pw.deleteFilter(s, id); return json({ ok: true }); });
