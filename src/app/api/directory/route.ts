import crypto from 'node:crypto';
import { z } from 'zod';
import { ApiError, actorOf, handle, json, readJson } from '@/lib/api';
import { logAuditEvent } from '@/lib/audit';
import { isSeniorManagement } from '@/lib/office-workflow';
import { getBranchScope } from '@/lib/branch-access';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
const create = z.object({ kind: z.enum(['EXPERT', 'TRANSLATOR', 'PROVIDER']), name: z.string().trim().min(2).max(200), specialty: z.string().max(200).optional(), phone: z.string().max(40).optional(), email: z.string().email().max(200).optional(), notes: z.string().max(1000).optional() });
const patch = z.object({ id: z.string().min(1), active: z.boolean() });
async function canWrite(s: Awaited<ReturnType<typeof actorOf>>) { return (await isSeniorManagement(s)) || (await getBranchScope(s)).officeManager; }
/** Directory of experts, translators and providers (item 185). Any signed-in staff or lawyer reads it. Senior management and office managers write it (proposed rule, see docs/proposed-permission-policies.md). No delete. */
export const GET = handle(async (req: Request) => {
  await actorOf(); const k = new URL(req.url).searchParams.get('kind');
  return json({ entries: await prisma.$queryRawUnsafe(`SELECT "id","kind","name","specialty","phone","email","notes","active" FROM "office_directory" WHERE "active" AND ($1::text IS NULL OR "kind"=$1) ORDER BY "name" LIMIT 300`, k) });
});
export const POST = handle(async (req: Request) => {
  const s = await actorOf(); if (!(await canWrite(s))) throw new ApiError(403, 'إضافة الجهات للإدارة ومديري المكاتب فقط');
  const i = await readJson(req, create); const id = 'dir_' + crypto.randomUUID().replaceAll('-', '');
  await prisma.$executeRawUnsafe(`INSERT INTO "office_directory" ("id","kind","name","specialty","phone","email","notes","created_by") VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, id, i.kind, i.name, i.specialty ?? null, i.phone ?? null, i.email ?? null, i.notes ?? null, s.role === 'admin' ? 'admin:' + s.userId : 'lawyer:' + s.lawyerId);
  await logAuditEvent({ actorUserId: s.role === 'admin' ? s.userId : null, actorLawyerId: s.role === 'lawyer' ? s.lawyerId : null, action: 'DIRECTORY_ADDED', resourceType: 'directory', resourceId: id, summary: i.kind + ': ' + i.name });
  return json({ id }, { status: 201 });
});
export const PATCH = handle(async (req: Request) => {
  const s = await actorOf(); if (!(await canWrite(s))) throw new ApiError(403, 'للإدارة ومديري المكاتب فقط');
  const i = await readJson(req, patch); const n = await prisma.$executeRawUnsafe(`UPDATE "office_directory" SET "active"=$1 WHERE "id"=$2`, i.active, i.id);
  if (!n) throw new ApiError(404, 'غير موجود');
  await logAuditEvent({ actorUserId: s.role === 'admin' ? s.userId : null, actorLawyerId: s.role === 'lawyer' ? s.lawyerId : null, action: 'DIRECTORY_ACTIVE', resourceType: 'directory', resourceId: i.id, summary: i.active ? 'تفعيل' : 'إيقاف' });
  return json({ ok: true });
});
