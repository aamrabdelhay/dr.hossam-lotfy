import { z } from 'zod';
import { handle, json, readJson, requirePermission } from '@/lib/api';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  name: z.string().trim().min(1).max(300),
  phone: z.string().trim().max(100).optional().nullable(),
  email: z.string().trim().max(200).optional().nullable(),
  nationalId: z.string().trim().max(50).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  notes: z.string().trim().max(4000).optional().nullable(),
  assignedLawyerId: z.string().trim().optional().nullable(),
});

export const PUT = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requirePermission('viewAdmin');
  const { id } = await params;
  const data = await readJson(req as never, schema);
  if (data.assignedLawyerId) {
    const lawyers = await prisma.$queryRawUnsafe<Array<{ id: string }>>('SELECT "id" FROM "lawyers" WHERE "id"=$1 AND "active"=true LIMIT 1', data.assignedLawyerId);
    if (!lawyers[0]) return json({ error: 'المحامي المحدد غير موجود أو غير نشط' }, { status: 400 });
  }
  const result = await prisma.$executeRawUnsafe(`UPDATE "clients" SET "name"=$1,"phone"=$2,"email"=$3,"nationalId"=$4,"address"=$5,"notes"=$6,"assignedLawyerId"=$7,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$8`, data.name, data.phone || null, data.email || null, data.nationalId || null, data.address || null, data.notes || null, data.assignedLawyerId || null, id);
  if (!result) return json({ error: 'العميل غير موجود' }, { status: 404 });
  return json({ ok: true });
});
