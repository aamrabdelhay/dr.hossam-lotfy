import { z } from 'zod';
import { ApiError, actorOf, handle, json, readJson, requirePermission } from '@/lib/api';
import { copyTask } from '@/lib/data-tools';
export const dynamic = 'force-dynamic';
export const POST = handle(async (req: Request) => {
  await requirePermission('writeTasks'); const s = await actorOf();
  const b = await readJson(req, z.object({ type: z.literal('task'), id: z.string().min(1) }));
  const id = await copyTask(s, b.id);
  if (!id) throw new ApiError(404, 'العنصر غير موجود');
  return json({ ok: true, id }, { status: 201 });
});
