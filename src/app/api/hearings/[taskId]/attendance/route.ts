import { z } from 'zod';
import { actorOf, handle, json, readJson } from '@/lib/api';
import { canActOnTask, listAttendance, recordAttendance } from '@/lib/hearings';
export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ taskId: string }> };
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { taskId } = await ctx.params; const s = await actorOf(); const c = await canActOnTask(s, taskId);
  if (!c) return json({ error: 'غير موجود' }, { status: 404 }); if (!c.allowed) return json({ error: 'لا تملك صلاحية' }, { status: 403 });
  return json({ items: await listAttendance(taskId) });
});
const schema = z.object({ kind: z.enum(['ARRIVE', 'DEPART']), note: z.string().max(300).optional() });
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { taskId } = await ctx.params; const s = await actorOf(); const b = await readJson(req, schema);
  const r = await recordAttendance(s, taskId, b.kind, b.note);
  if ('error' in r) return json(r, { status: r.error === 'not-found' ? 404 : r.error === 'out-of-order' ? 409 : 403 });
  return json(r, { status: 201 });
});
