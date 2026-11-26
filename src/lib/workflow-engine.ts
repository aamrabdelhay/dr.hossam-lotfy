import { isTelegramConfigured, sendTelegramGroupNotification } from '@/lib/telegram';
import 'server-only';
import { summarize, type FinRow } from '@/lib/case-finance';
import { prisma } from '@/lib/prisma';
type Rule = { id: string; event_kind: string; threshold_days: number; notify_group: 'SENIOR' | 'FINANCE' };
type Hit = { subject: string; title: string; body: string; link: string };
const WALLED = `NOT EXISTS (SELECT 1 FROM "office_case_security" s WHERE s."case_id"=c."id" AND (s."ethical_wall_enabled" OR s."classification" IN ('CONFIDENTIAL','HIGHLY_CONFIDENTIAL')))`;
/** Recipients: senior management (and, for FINANCE rules, finance members too). Lawyers and admin users. */
async function recipients(group: 'SENIOR' | 'FINANCE') {
  const lawyers = await prisma.$queryRawUnsafe<{ id: string }[]>(`SELECT "lawyer_id" AS id FROM "office_senior_members" WHERE "lawyer_id" IS NOT NULL UNION SELECT "id" FROM "lawyers" WHERE "active" AND "isPrincipal" ${group === 'FINANCE' ? `UNION SELECT "lawyer_id" FROM "office_finance_members"` : ''}`);
  const members = await prisma.$queryRawUnsafe<{ id: string }[]>(`SELECT "user_id" AS id FROM "office_senior_members" WHERE "user_id" IS NOT NULL`);
  const admins = await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } }, select: { id: true } });
  return { lawyers: [...new Set(lawyers.map((x) => x.id))], users: [...new Set([...members.map((x) => x.id), ...admins.map((x) => x.id)])] };
}
async function hits(rule: Rule, today: string): Promise<Hit[]> {
  if (rule.event_kind === 'INSTALLMENT_OVERDUE') {
    const r = await prisma.$queryRawUnsafe<{ id: string; number: string; due: string; case_id: string }[]>(`SELECT f."id", c."number", to_char(f."due_on",'YYYY-MM-DD') AS due, c."id" AS case_id FROM "case_finance_entries" f JOIN "case_records" c ON c."id"=f."case_id" WHERE f."kind"='INSTALLMENT' AND f."status"='OPEN' AND f."due_on" < ($1::date - $2::int) AND ${WALLED} LIMIT 500`, today, rule.threshold_days);
    return r.map((x) => ({ subject: x.id, title: 'قسط متأخر', body: `قضية ${x.number}: قسط مستحق في ${x.due} لم يسدد`, link: `/cases/${x.case_id}` }));
  }
  if (rule.event_kind === 'BUDGET_NEAR' || rule.event_kind === 'BUDGET_EXCEEDED') {
    const cases = await prisma.$queryRawUnsafe<{ id: string; number: string }[]>(`SELECT c."id", c."number" FROM "case_records" c WHERE EXISTS (SELECT 1 FROM "case_finance_entries" f WHERE f."case_id"=c."id" AND f."kind"='BUDGET' AND f."status"<>'CANCELLED') AND ${WALLED} LIMIT 500`);
    const out: Hit[] = [];
    for (const c of cases) {
      const rows = await prisma.$queryRawUnsafe<FinRow[]>(`SELECT "id","case_id","kind","amount"::text AS amount,"currency",NULL AS due_on,"status","ref_id","note","created_at"::text AS created_at FROM "case_finance_entries" WHERE "case_id"=$1 AND "kind" IN ('BUDGET','EXPENSE')`, c.id);
      const s = summarize(rows); const want = rule.event_kind === 'BUDGET_EXCEEDED' ? 'EXCEEDED' : 'NEAR';
      if (s.budgetState === want) out.push({ subject: c.id, title: want === 'EXCEEDED' ? 'تجاوز ميزانية قضية' : 'اقتراب من ميزانية قضية', body: `قضية ${c.number}: المصروفات ${s.budgetUsedPct}% من الميزانية`, link: `/cases/${c.id}` });
    }
    return out;
  }
  if (rule.event_kind === 'TASK_OVERDUE') {
    const r = await prisma.$queryRawUnsafe<{ id: string; description: string; d: string }[]>(`SELECT t."id", t."description", to_char(t."scheduledDate",'YYYY-MM-DD') AS d FROM "tasks" t LEFT JOIN "case_records" c ON c."id"=t."caseId" WHERE t."status" IN ('PENDING','IN_PROGRESS') AND t."scheduledDate" < ($1::date - $2::int) AND (t."caseId" IS NULL OR ${WALLED}) ORDER BY t."scheduledDate" LIMIT 300`, today, rule.threshold_days);
    return r.map((x) => ({ subject: x.id, title: 'مهمة متأخرة', body: `${x.description.slice(0, 120)} (${x.d})`, link: '/admin/operations' }));
  }
  if (rule.event_kind === 'REVIEW_PENDING') {
    const r = await prisma.$queryRawUnsafe<{ id: string; number: string; case_id: string }[]>(`SELECT f."id", c."number", c."id" AS case_id FROM "case_files" f JOIN "case_records" c ON c."id"=f."case_id" WHERE f."review_status"='IN_REVIEW' AND f."deleted_at" IS NULL AND f."created_at" < (($1::date - $2::int)::timestamptz) AND ${WALLED} LIMIT 300`, today, rule.threshold_days);
    return r.map((x) => ({ subject: x.id, title: 'مستند ينتظر المراجعة', body: `قضية ${x.number}: مستند في المراجعة لأكثر من ${rule.threshold_days} يوم`, link: `/cases/${x.case_id}` }));
  }
  return [];
}
/** Run every enabled rule once. Idempotent per (rule, subject, day). Walled and confidential cases are skipped so a notification never names a case someone cannot open. */
export async function runWorkflow(today: string) {
  const rules = await prisma.$queryRawUnsafe<Rule[]>(`SELECT "id","event_kind","threshold_days","notify_group" FROM "office_workflow_rules" WHERE "enabled"`);
  const result: Record<string, number> = {};
  for (const rule of rules) {
    const rec = await recipients(rule.notify_group); let sent = 0;
    for (const h of await hits(rule, today)) {
      const n = await prisma.$executeRawUnsafe(`INSERT INTO "office_workflow_runs" ("rule_id","subject_id","fired_on") VALUES ($1,$2,$3::date) ON CONFLICT DO NOTHING`, rule.id, h.subject, today);
      if (!n) continue; sent++;
      for (const lawyerId of rec.lawyers) await prisma.notification.create({ data: { lawyerId, type: 'WORKFLOW', title: h.title, body: h.body, link: h.link } });
      for (const userId of rec.users) await prisma.notification.create({ data: { userId, type: 'WORKFLOW', title: h.title, body: h.body, link: h.link } });
    }
    result[rule.event_kind] = sent;
  }
  const total = Object.values(result).reduce((a, b) => a + b, 0);
  // Item 218: a generic, config-gated group ping. Counts only: the group may be wider than the case wall, so no case, client or amount is named.
  if (total > 0 && isTelegramConfigured()) await sendTelegramGroupNotification(`<b>تنبيهات سير العمل</b>\nعدد التنبيهات الجديدة: ${total}\nافتح المنصة للتفاصيل.`).catch((e) => console.error('Workflow Telegram failed:', e));
  return result;
}
