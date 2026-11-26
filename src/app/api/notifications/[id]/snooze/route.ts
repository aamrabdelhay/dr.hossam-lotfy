import { z } from 'zod';
import { ApiError, handle, json, readJson, user } from '@/lib/api';
import { setPriority, snooze } from '@/lib/notification-meta';
export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };
/** Body: { until: ISO date | null } and/or { priority }. Owner only. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const s = await user(); if (!s) throw new ApiError(401, 'سجّل الدخول أولاً');
  const { id } = await ctx.params;
  const b = await readJson(req, z.object({ until: z.string().datetime().nullable().optional(), priority: z.enum(['LOW', 'NORMAL', 'HIGH']).optional() }));
  if (b.until === undefined && !b.priority) throw new ApiError(400, 'لا يوجد تغيير');
  if (b.until !== undefined && !(await snooze(s, id, b.until ? new Date(b.until) : null))) throw new ApiError(404, 'غير موجود أو مدة غير صالحة');
  if (b.priority && !(await setPriority(s, id, b.priority))) throw new ApiError(404, 'غير موجود');
  return json({ ok: true });
});
