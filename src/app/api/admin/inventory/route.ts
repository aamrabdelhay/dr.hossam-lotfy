import crypto from 'node:crypto';
import { z } from 'zod';
import { ApiError, actorOf, handle, json, readJson } from '@/lib/api';
import { logAuditEvent } from '@/lib/audit';
import { logScope } from '@/lib/office-log';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
const create = z.object({ name: z.string().trim().min(2).max(200), unit: z.string().trim().max(30).optional(), minQty: z.number().int().min(0).max(1e6).optional(), branchId: z.string().max(100).optional(), initialQty: z.number().int().min(1).max(1e6).optional() });
const move = z.object({ itemId: z.string().min(1), delta: z.number().int().refine((n) => n !== 0).refine((n) => Math.abs(n) <= 1e6), reason: z.string().max(300).optional() });
const aid = (s: Awaited<ReturnType<typeof actorOf>>) => ({ actorUserId: s.role === 'admin' ? s.userId : null, actorLawyerId: s.role === 'lawyer' ? s.lawyerId : null });
const who = (s: Awaited<ReturnType<typeof actorOf>>) => (s.role === 'admin' ? 'admin:' + s.userId : 'lawyer:' + s.lawyerId);
/** Inventory (item 182). Same people and branch limits as the office log (proposed rule). Quantity = sum of movements; stock can never go below zero. */
export const GET = handle(async () => {
  const s = await actorOf(); const sc = await logScope(s);
  const rows = await prisma.$queryRawUnsafe<{ id: string; branch_id: string; name: string; unit: string; min_qty: number; qty: number; low: boolean }[]>(
    `SELECT i."id", i."branch_id", i."name", i."unit", i."min_qty", COALESCE(SUM(m."delta"),0)::int AS qty, COALESCE(SUM(m."delta"),0) < i."min_qty" AS low
       FROM "office_inventory_items" i LEFT JOIN "office_inventory_moves" m ON m."item_id"=i."id" WHERE i."active" AND ($1::boolean OR i."branch_id" = ANY($2::text[])) GROUP BY i."id" ORDER BY i."name" LIMIT 300`, sc.all, sc.branches);
  return json({ items: rows });
});
export const POST = handle(async (req: Request) => {
  const s = await actorOf(); const sc = await logScope(s); const i = await readJson(req, create);
  const branch = i.branchId ?? (sc.all ? 'branch_main' : sc.branches[0]); if (!sc.all && !sc.branches.includes(branch)) throw new ApiError(403, 'هذا الفرع خارج نطاقك');
  const id = 'inv_' + crypto.randomUUID().replaceAll('-', '');
  await prisma.$executeRawUnsafe(`INSERT INTO "office_inventory_items" ("id","branch_id","name","unit","min_qty","created_by") VALUES ($1,$2,$3,COALESCE($4,'قطعة'),$5,$6)`, id, branch, i.name, i.unit ?? null, i.minQty ?? 0, who(s));
  if (i.initialQty) await prisma.$executeRawUnsafe(`INSERT INTO "office_inventory_moves" ("id","item_id","delta","reason","created_by") VALUES ($1,$2,$3,'رصيد افتتاحي',$4)`, 'mv_' + crypto.randomUUID().replaceAll('-', ''), id, i.initialQty, who(s));
  await logAuditEvent({ ...aid(s), action: 'INVENTORY_ITEM_ADDED', resourceType: 'inventory', resourceId: id, summary: i.name });
  return json({ id }, { status: 201 });
});
export const PATCH = handle(async (req: Request) => {
  const s = await actorOf(); const sc = await logScope(s); const i = await readJson(req, move);
  const [it] = await prisma.$queryRawUnsafe<{ branch_id: string }[]>(`SELECT "branch_id" FROM "office_inventory_items" WHERE "id"=$1 AND "active"`, i.itemId);
  if (!it || (!sc.all && !sc.branches.includes(it.branch_id))) throw new ApiError(404, 'غير موجود');
  const [cur] = await prisma.$queryRawUnsafe<{ q: number }[]>(`SELECT COALESCE(SUM("delta"),0)::int AS q FROM "office_inventory_moves" WHERE "item_id"=$1`, i.itemId);
  if (cur.q + i.delta < 0) throw new ApiError(400, 'الرصيد لا يكفي (المتاح ' + cur.q + ')');
  await prisma.$executeRawUnsafe(`INSERT INTO "office_inventory_moves" ("id","item_id","delta","reason","created_by") VALUES ($1,$2,$3,$4,$5)`, 'mv_' + crypto.randomUUID().replaceAll('-', ''), i.itemId, i.delta, i.reason ?? null, who(s));
  await logAuditEvent({ ...aid(s), action: 'INVENTORY_MOVE', resourceType: 'inventory', resourceId: i.itemId, summary: 'حركة ' + i.delta, metadata: { reason: i.reason ?? null } });
  return json({ qty: cur.q + i.delta });
});
