import crypto from 'node:crypto';
import { z } from 'zod';
import { ApiError, actorOf, handle, json, readJson } from '@/lib/api';
import { isSeniorManagement } from '@/lib/office-workflow';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
const create = z.object({ title: z.string().trim().min(3).max(200), category: z.string().trim().max(100).optional(), steps: z.array(z.string().trim().min(2).max(300)).min(1).max(40), sourceRef: z.string().trim().max(300).optional() });
const patch = z.object({ id: z.string().min(1), active: z.boolean() });
/** Playbooks (item 142): ordered steps written by senior management. Lawyers read them and can apply one to a case (creates checklist items in the case register). The system ships none. */
export const GET = handle(async () => {
  const s = await actorOf(); if (s.role !== 'lawyer' && !(await isSeniorManagement(s))) throw new ApiError(403, 'غير مسموح');
  return json({ playbooks: await prisma.$queryRawUnsafe(`SELECT "id","title","category","steps","source_ref" FROM "office_playbooks" WHERE "active" ORDER BY "title" LIMIT 200`) });
});
export const POST = handle(async (req: Request) => {
  const s = await actorOf(); if (!(await isSeniorManagement(s))) throw new ApiError(403, 'كتابة أدلة الإجراءات للإدارة العليا فقط');
  const i = await readJson(req, create); const id = 'pb_' + crypto.randomUUID().replaceAll('-', '');
  await prisma.$executeRawUnsafe(`INSERT INTO "office_playbooks" ("id","title","category","steps","source_ref","created_by") VALUES ($1,$2,$3,$4::jsonb,$5,$6)`, id, i.title, i.category ?? null, JSON.stringify(i.steps), i.sourceRef ?? null, s.role === 'admin' ? 'admin:' + s.userId : 'lawyer:' + s.lawyerId);
  return json({ id }, { status: 201 });
});
export const PATCH = handle(async (req: Request) => {
  const s = await actorOf(); if (!(await isSeniorManagement(s))) throw new ApiError(403, 'للإدارة العليا فقط');
  const i = await readJson(req, patch); const n = await prisma.$executeRawUnsafe(`UPDATE "office_playbooks" SET "active"=$1 WHERE "id"=$2`, i.active, i.id);
  if (!n) throw new ApiError(404, 'غير موجود'); return json({ ok: true });
});
