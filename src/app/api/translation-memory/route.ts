import crypto from 'node:crypto';
import { z } from 'zod';
import { ApiError, actorOf, handle, json, readJson } from '@/lib/api';
import { logAuditEvent } from '@/lib/audit';
import { isSeniorManagement } from '@/lib/office-workflow';
import { getBranchScope } from '@/lib/branch-access';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
const lang = z.enum(['ar', 'en', 'fr']);
const create = z.object({ sourceLang: lang, targetLang: lang, sourceText: z.string().trim().min(1).max(500), targetText: z.string().trim().min(1).max(500), sourceRef: z.string().trim().max(300).optional() }).refine((v) => v.sourceLang !== v.targetLang, { message: 'اللغتان متطابقتان' });
const patch = z.object({ id: z.string().min(1), active: z.boolean() });
async function canWrite(s: Awaited<ReturnType<typeof actorOf>>) { return (await isSeniorManagement(s)) || (await getBranchScope(s)).officeManager; }
/** Legal translation memory (item 162): term pairs entered by people with an optional source reference. It is a lookup list, not machine translation. Everyone signed in reads; senior management and office managers write (proposed rule). No delete. */
export const GET = handle(async (req: Request) => {
  await actorOf(); const sp = new URL(req.url).searchParams; const q = (sp.get('q') ?? '').trim().slice(0, 100);
  const sl = lang.safeParse(sp.get('from')).data ?? null; const tl = lang.safeParse(sp.get('to')).data ?? null;
  const like = '%' + q.replace(/[%_\\]/g, '\\$&') + '%';
  return json({ entries: await prisma.$queryRawUnsafe(`SELECT "id","source_lang","target_lang","source_text","target_text","source_ref" FROM "office_translation_memory" WHERE "active" AND ($1::text IS NULL OR "source_lang"=$1) AND ($2::text IS NULL OR "target_lang"=$2) AND ($3 = '' OR "source_text" ILIKE $4 OR "target_text" ILIKE $4) ORDER BY "source_text" LIMIT 100`, sl, tl, q, like) });
});
export const POST = handle(async (req: Request) => {
  const s = await actorOf(); if (!(await canWrite(s))) throw new ApiError(403, 'إضافة المصطلحات للإدارة ومديري المكاتب فقط');
  const i = await readJson(req, create); const id = 'tm_' + crypto.randomUUID().replaceAll('-', '');
  await prisma.$executeRawUnsafe(`INSERT INTO "office_translation_memory" ("id","source_lang","target_lang","source_text","target_text","source_ref","created_by") VALUES ($1,$2,$3,$4,$5,$6,$7)`, id, i.sourceLang, i.targetLang, i.sourceText, i.targetText, i.sourceRef ?? null, s.role === 'admin' ? 'admin:' + s.userId : 'lawyer:' + s.lawyerId);
  await logAuditEvent({ actorUserId: s.role === 'admin' ? s.userId : null, actorLawyerId: s.role === 'lawyer' ? s.lawyerId : null, action: 'TRANSLATION_MEMORY_ADDED', resourceType: 'translation_memory', resourceId: id, summary: i.sourceLang + '>' + i.targetLang });
  return json({ id }, { status: 201 });
});
export const PATCH = handle(async (req: Request) => {
  const s = await actorOf(); if (!(await canWrite(s))) throw new ApiError(403, 'للإدارة ومديري المكاتب فقط');
  const i = await readJson(req, patch); const n = await prisma.$executeRawUnsafe(`UPDATE "office_translation_memory" SET "active"=$1 WHERE "id"=$2`, i.active, i.id);
  if (!n) throw new ApiError(404, 'غير موجود'); return json({ ok: true });
});
