import { z } from 'zod';
import { handle, json, readJson, requirePermission } from '@/lib/api';
import { NUMBER_SCOPES, nextNumber } from '@/lib/office-ops';
export const dynamic = 'force-dynamic';
export const POST = handle(async (req: Request) => {
  await requirePermission('writeTasks');
  const b = await readJson(req, z.object({ scope: z.enum(Object.keys(NUMBER_SCOPES) as [keyof typeof NUMBER_SCOPES, ...(keyof typeof NUMBER_SCOPES)[]]) }));
  return json({ number: await nextNumber(b.scope), qr: 'pending: no QR library installed' }, { status: 201 });
});
