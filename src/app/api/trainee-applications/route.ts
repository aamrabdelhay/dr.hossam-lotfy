import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handle, json, readJson, requirePermission } from '@/lib/api';

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  college: z.string().trim().min(1).max(250),
  year: z.enum(['الفرقة الأولى','الفرقة الثانية','الفرقة الثالثة','الفرقة الرابعة','خريج','طالب دراسات عليا']),
  phone: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(200),
  linkedin: z.string().trim().url().max(500).optional().or(z.literal('')),
  experiences: z.array(z.string().trim().min(1).max(500)).max(20).default([]),
  whyTraining: z.string().trim().max(3000).optional().or(z.literal('')),
});

export const POST = handle(async (req: Request) => {
  const data = await readJson(req as never, schema);
  const id = `trainee_${crypto.randomUUID().replaceAll('-', '')}`;
  await prisma.$executeRawUnsafe(`INSERT INTO "trainee_applications" ("id","name","college","year","phone","email","linkedin","experiences","whyTraining") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, id, data.name, data.college, data.year, data.phone, data.email, data.linkedin || null, data.experiences, data.whyTraining || null);
  return json({ ok: true, id }, { status: 201 });
});

export const GET = handle(async () => {
  await requirePermission('viewAdmin');
  const rows = await prisma.$queryRawUnsafe<Array<{id:string;name:string;college:string;year:string;phone:string;email:string;linkedin:string|null;experiences:string[];whyTraining:string|null;createdAt:Date}>>(`SELECT "id","name","college","year","phone","email","linkedin","experiences","whyTraining","createdAt" FROM "trainee_applications" ORDER BY "createdAt" DESC LIMIT 500`);
  return json({ applications: rows });
});
