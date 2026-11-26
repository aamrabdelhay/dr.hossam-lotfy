import { z } from 'zod';
import { ApiError, handle, json, readJson, user } from '@/lib/api';
import * as pw from '@/lib/personal-workspace';
export const dynamic = 'force-dynamic';
async function me() { const s = await user(); if (!s) throw new ApiError(401, 'يجب تسجيل الدخول'); return s; }
export const GET = handle(async () => json({ prefs: await pw.getPrefs(await me()) }));
export const PUT = handle(async (req: Request) => {
  const s = await me();
  const body = await readJson(req, z.object({ key: z.enum(Object.keys(pw.PREF_SCHEMAS) as [pw.PrefKey, ...pw.PrefKey[]]), value: z.unknown() }));
  try { return json({ ok: true, value: await pw.setPref(s, body.key, body.value) }); } catch { throw new ApiError(400, 'قيمة غير صالحة'); }
});
