import crypto from 'node:crypto';
import { z } from 'zod';
import { ApiError, actorOf, handle, json, readJson } from '@/lib/api';
import { logAuditEvent } from '@/lib/audit';
import { isSeniorManagement } from '@/lib/office-workflow';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
const create = z.object({ kind: z.enum(['PRECEDENT', 'JUDGMENT', 'MEMO']), title: z.string().trim().min(3).max(300), court: z.string().trim().max(200).optional(), decidedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), summary: z.string().trim().max(4000).optional(), sourceRef: z.string().trim().min(3).max(300), tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]) });
const patch = z.object({ id: z.string().min(1), active: z.boolean() });
/** Library of precedents, judgments and memos (item 144). Staff and lawyers read; lawyers add entries; a source reference is required so nothing is anonymous or invented. Only senior management deactivates. Text only: do not enter client data. No delete. */
export const GET = handle(async (req: Request) => {
  const s = await actorOf(); if (s.role !== 'lawyer' && !(await isSeniorManagement(s))) throw new ApiError(403, 'غير مسموح');
  const sp = new URL(req.url).searchParams; const q = (sp.get('q') ?? '').trim().slice(0, 100); const k = sp.get('kind'); const tag = (sp.get('tag') ?? '').trim();
  const like = '%' + q.replace(/[%_\\]/g, '\\$&') + '%';
  return json({ entries: await prisma.$queryRawUnsafe(`SELECT "id","kind","title","court",to_char("decided_on",'YYYY-MM-DD') AS decided_on,"summary","source_ref","tags" FROM "office_library" WHERE "active" AND ($1::text IS NULL OR "kind"=$1) AND ($2::text = '' OR $2::text = ANY("tags")) AND ($3::text = '' OR "title" ILIKE $4 OR "summary" ILIKE $4 OR "court" ILIKE $4) ORDER BY "created_at" DESC LIMIT 200`, k, tag, q, like) });
});
export const POST = handle(async (req: Request) => {
  const s = await actorOf(); if (s.role !== 'lawyer' && !(await isSeniorManagement(s))) throw new ApiError(403, 'غير مسموح');
  const i = await readJson(req, create); const id = 'lib_' + crypto.randomUUID().replaceAll('-', '');
  await prisma.$executeRawUnsafe(`INSERT INTO "office_library" ("id","kind","title","court","decided_on","summary","source_ref","tags","created_by") VALUES ($1,$2,$3,$4,$5::date,$6,$7,$8::text[],$9)`, id, i.kind, i.title, i.court ?? null, i.decidedOn ?? null, i.summary ?? null, i.sourceRef, [...new Set(i.tags)], s.role === 'admin' ? 'admin:' + s.userId : 'lawyer:' + s.lawyerId);
  await logAuditEvent({ actorUserId: s.role === 'admin' ? s.userId : null, actorLawyerId: s.role === 'lawyer' ? s.lawyerId : null, action: 'LIBRARY_ADDED', resourceType: 'library', resourceId: id, summary: i.kind + ': ' + i.title });
  return json({ id }, { status: 201 });
});
export const PATCH = handle(async (req: Request) => {
  const s = await actorOf(); if (!(await isSeniorManagement(s))) throw new ApiError(403, 'للإدارة العليا فقط');
  const i = await readJson(req, patch); const n = await prisma.$executeRawUnsafe(`UPDATE "office_library" SET "active"=$1 WHERE "id"=$2`, i.active, i.id);
  if (!n) throw new ApiError(404, 'غير موجود'); return json({ ok: true });
});
