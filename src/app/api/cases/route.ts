import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handle, json, readJson, requirePermission, user } from '@/lib/api';

export const GET = handle(async () => {
  const session = await user();
  if (!session) return json({ error: 'يجب تسجيل الدخول لعرض ملفات القضايا' }, { status: 401 });
  const cases = await prisma.caseRecord.findMany({ orderBy: { id: 'desc' }, take: 200 });
  return json({ cases });
});

const createSchema = z.object({
  name: z.string().min(1, 'اسم القضية مطلوب').max(300),
  number: z.string().min(1, 'رقم القضية مطلوب').max(200),
  description: z.string().max(1000).optional(),
});

export const POST = handle(async (req: Request) => {
  await requirePermission('writeTasks');
  const data = await readJson(req as never, createSchema);
  const c = await prisma.caseRecord.create({
    data: { name: data.name.trim(), number: data.number.trim(), description: data.description?.trim() || null },
  });
  return json({ ok: true, case: c }, { status: 201 });
});
