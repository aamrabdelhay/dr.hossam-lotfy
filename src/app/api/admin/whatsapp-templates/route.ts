import { z } from 'zod';
import { ApiError, actorOf, handle, json, readJson, requirePermission, user } from '@/lib/api';
import { listWaTemplates, renderWaTemplate, saveWaTemplate } from '@/lib/office-ops';
export const dynamic = 'force-dynamic';
export const GET = handle(async () => { if (!(await user())) throw new ApiError(401, 'يجب تسجيل الدخول'); return json({ templates: await listWaTemplates() }); });
export const POST = handle(async (req: Request) => {
  await requirePermission('writeTasks'); const s = await actorOf();
  const r = await saveWaTemplate(s, await readJson(req, z.object({ name: z.string().min(1).max(120), body: z.string().min(1).max(1500) })));
  if ('error' in r) return json(r, { status: 400 });
  return json({ ok: true }, { status: 201 });
});
/** Render only. Returns text and a wa.me link. Nothing is sent. */
export const PUT = handle(async (req: Request) => {
  if (!(await user())) throw new ApiError(401, 'يجب تسجيل الدخول'); const s = await actorOf();
  const r = await renderWaTemplate(s, ...(await (async () => { const b = await readJson(req, z.object({ templateId: z.string().min(1), clientId: z.string().optional(), values: z.record(z.string(), z.string().max(200)).optional() })); return [b.templateId, { clientId: b.clientId, values: b.values }] as const; })()));
  if ('error' in r) return json(r, { status: r.error === 'no-branch-access' ? 403 : 404 });
  return json(r);
});
