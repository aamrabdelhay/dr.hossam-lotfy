import { z } from 'zod';
import { ApiError, actorOf, handle, json, readJson, user } from '@/lib/api';
import { submitForm } from '@/lib/form-builder';
export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };
export const POST = handle(async (req: Request, ctx: Ctx) => {
  if (!(await user())) throw new ApiError(401, 'يجب تسجيل الدخول'); const s = await actorOf(); const { id } = await ctx.params;
  const r = await submitForm(s, id, (await readJson(req, z.object({ answers: z.record(z.string(), z.unknown()) }))).answers);
  if ('error' in r) return json(r, { status: r.error === 'form-not-found' ? 404 : 400 });
  return json(r, { status: 201 });
});
