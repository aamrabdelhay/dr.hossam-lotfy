import { z } from 'zod';
import { ApiError, actorOf, handle, json, readJson } from '@/lib/api';
import { decideSubstitute, requestSubstitute } from '@/lib/hearings';
export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ taskId: string }> };
const askSchema = z.object({ toLawyerId: z.string().min(1), reason: z.string().trim().min(3).max(1000) });
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { taskId } = await ctx.params; const s = await actorOf(); const b = await readJson(req, askSchema);
  const r = await requestSubstitute(s, taskId, b.toLawyerId, b.reason);
  if ('error' in r) return json(r, { status: r.error === 'not-found' ? 404 : r.error === 'forbidden' ? 403 : 400 });
  return json(r, { status: 201 });
});
const decideSchema = z.object({ substituteId: z.string().min(1), accept: z.boolean() });
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  await ctx.params; const s = await actorOf(); const b = await readJson(req, decideSchema);
  const r = await decideSubstitute(s, b.substituteId, b.accept);
  if ('error' in r) throw new ApiError(r.error === 'not-found' ? 404 : r.error === 'forbidden' ? 403 : 409, 'لا يمكن تنفيذ الطلب');
  return json(r);
});
