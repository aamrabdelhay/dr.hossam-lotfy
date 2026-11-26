import { z } from 'zod';
import { ApiError, handle, json, readJson, user } from '@/lib/api';
import * as pw from '@/lib/personal-workspace';
export const dynamic = 'force-dynamic';
async function me() { const s = await user(); if (!s) throw new ApiError(401, 'يجب تسجيل الدخول'); return s; }
const key = z.object({ formKey: z.string().min(1).max(80), recordRef: z.string().max(120).default('') });
export const GET = handle(async (req: Request) => { const s = await me(); const u = new URL(req.url); const k = key.parse({ formKey: u.searchParams.get('formKey'), recordRef: u.searchParams.get('recordRef') ?? '' }); return json({ versions: await pw.listDrafts(s, k.formKey, k.recordRef) }); });
export const POST = handle(async (req: Request) => { const s = await me(); try { return json({ ok: true, version: await pw.saveDraft(s, await readJson(req, pw.draftSchema)) }, { status: 201 }); } catch (e) { if (e instanceof ApiError) throw e; throw new ApiError(400, 'المسودة كبيرة جداً'); } });
export const DELETE = handle(async (req: Request) => { const s = await me(); const k = await readJson(req, key); await pw.clearDrafts(s, k.formKey, k.recordRef); return json({ ok: true }); });
