import { z } from 'zod';
import { actorOf, handle, json, readJson, requirePermission } from '@/lib/api';
import { BULK_STATUSES, bulkEditTasks } from '@/lib/data-tools';
export const dynamic = 'force-dynamic';
export const POST = handle(async (req: Request) => {
  await requirePermission('writeTasks'); const s = await actorOf();
  const b = await readJson(req, z.object({
    ids: z.array(z.string().min(1)).min(1).max(100),
    patch: z.object({ status: z.enum(BULK_STATUSES).optional(), scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(), scheduledTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional() }).strict().refine((p) => Object.keys(p).length > 0, 'empty patch'),
    dryRun: z.boolean().default(true),
  }));
  return json(await bulkEditTasks(s, b.ids, b.patch, b.dryRun));
});
