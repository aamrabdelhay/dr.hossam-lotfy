import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handle, json, readJson, requirePermission } from '@/lib/api';
const schema = z.object({ caseId: z.string().min(1) });
export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requirePermission('writeTasks'); const { id } = await params; const data = await readJson(req as never, schema);
  const client = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`SELECT "id" FROM "clients" WHERE "id"=$1 LIMIT 1`, id);
  if (!client[0]) return json({ error: 'العميل غير موجود' }, { status: 404 });
  const result = await prisma.$executeRawUnsafe(`UPDATE "case_records" SET "clientId"=$1 WHERE "id"=$2`, id, data.caseId);
  if (!result) return json({ error: 'القضية غير موجودة' }, { status: 404 });
  return json({ ok: true });
});
