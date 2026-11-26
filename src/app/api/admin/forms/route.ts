import { z } from 'zod';
import { ApiError, actorOf, handle, json, readJson, requirePermission, user } from '@/lib/api';
import { listForms, saveForm } from '@/lib/form-builder';
export const dynamic = 'force-dynamic';
export const GET = handle(async () => { if (!(await user())) throw new ApiError(401, 'يجب تسجيل الدخول'); return json({ forms: await listForms() }); });
export const POST = handle(async (req: Request) => {
  await requirePermission('writeTasks'); const s = await actorOf();
  const r = await saveForm(s, await readJson(req, z.object({ id: z.string().max(80).optional(), title: z.string().min(1).max(150), definition: z.unknown() })));
  if ('error' in r) return json(r, { status: 400 });
  return json(r, { status: 201 });
});
