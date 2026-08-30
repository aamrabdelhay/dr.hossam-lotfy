import { z } from 'zod';
import { handle, json, readJson } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

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
  const session = await getCurrentUser();
  if (!session) return json({ error: 'غير مصرح' }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.$queryRawUnsafe<Array<{ id: string; assignedLawyerId: string | null }>>(`SELECT "id","assignedLawyerId" FROM "clients" WHERE "id"=$1 LIMIT 1`, id);
  if (!existing[0]) return json({ error: 'العميل غير موجود' }, { status: 404 });
  const isAdmin = session.role === 'admin' || !!session.isAdmin;
  const isAssignedLawyer = session.role === 'lawyer' && session.lawyerId === existing[0].assignedLawyerId;
  if (!isAdmin && !isAssignedLawyer) return json({ error: 'ليس لديك صلاحية تعديل هذا العميل' }, { status: 403 });
  const data = await readJson(req as never, schema);
  if (data.assignedLawyerId && !isAdmin) return json({ error: 'تعيين أو تغيير المحامي المسؤول متاح للإدارة فقط' }, { status: 403 });
  if (data.assignedLawyerId) {
    const lawyers = await prisma.$queryRawUnsafe<Array<{ id: string }>>('SELECT "id" FROM "lawyers" WHERE "id"=$1 AND "active"=true LIMIT 1', data.assignedLawyerId);
    if (!lawyers[0]) return json({ error: 'المحامي المحدد غير موجود أو غير نشط' }, { status: 400 });
  }
  const assigned = isAdmin ? (data.assignedLawyerId || null) : existing[0].assignedLawyerId;
  await prisma.$executeRawUnsafe(`UPDATE "clients" SET "name"=$1,"phone"=$2,"email"=$3,"nationalId"=$4,"address"=$5,"notes"=$6,"assignedLawyerId"=$7,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$8`, data.name, data.phone || null, data.email || null, data.nationalId || null, data.address || null, data.notes || null, assigned, id);
  return json({ ok: true });
});
