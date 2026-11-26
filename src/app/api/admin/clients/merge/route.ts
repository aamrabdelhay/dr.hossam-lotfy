import { z } from 'zod';
import { ApiError, handle, json, readJson, requireAdmin } from '@/lib/api';
import { mergeClients } from '@/lib/data-tools';
export const dynamic = 'force-dynamic';
export const POST = handle(async (req: Request) => {
  const s = await requireAdmin(); // senior only
  const b = await readJson(req, z.object({ primaryId: z.string().min(1), secondaryId: z.string().min(1), dryRun: z.boolean().default(true), allowCrossBranch: z.boolean().default(false) }));
  const r = await mergeClients(s, b.primaryId, b.secondaryId, b.dryRun, b.allowCrossBranch);
  if (!r.ok) throw new ApiError(400, 'تعذر الدمج: ' + r.error);
  return json(r);
});
