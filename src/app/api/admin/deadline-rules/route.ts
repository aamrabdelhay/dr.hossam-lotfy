import { ApiError, actorOf, handle, json, readJson } from '@/lib/api';
import { isSeniorManagement } from '@/lib/office-workflow';
import { calc, createRule, listRules, NOTICE, ruleSchema } from '@/lib/deadlines';
export const dynamic = 'force-dynamic';
/** Deadline rules (item 113). There are no built-in legal periods: senior management enters each rule with its source. Any signed-in staff or lawyer can read and use them. */
export const GET = handle(async (req: Request) => {
  await actorOf(); const u = new URL(req.url);
  const ruleId = u.searchParams.get('ruleId'), start = u.searchParams.get('startDate');
  if (ruleId && start) { if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) throw new ApiError(400, 'تاريخ غير صالح'); const c = await calc(ruleId, start); if (!c) throw new ApiError(404, 'القاعدة غير موجودة'); return json(c); }
  return json({ rules: await listRules(), notice: NOTICE });
});
export const POST = handle(async (req: Request) => {
  const s = await actorOf(); if (!(await isSeniorManagement(s))) throw new ApiError(403, 'إضافة قواعد المهل للإدارة العليا فقط');
  return json(await createRule(s, await readJson(req, ruleSchema)), { status: 201 });
});
