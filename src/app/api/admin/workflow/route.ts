import crypto from 'node:crypto';
import { z } from 'zod';
import { ApiError, actorOf, handle, json, readJson } from '@/lib/api';
import { logAuditEvent } from '@/lib/audit';
import { isSeniorManagement } from '@/lib/office-workflow';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
const put = z.object({ eventKind: z.enum(['INSTALLMENT_OVERDUE', 'BUDGET_NEAR', 'BUDGET_EXCEEDED', 'TASK_OVERDUE', 'REVIEW_PENDING']), enabled: z.boolean(), thresholdDays: z.number().int().min(0).max(365).default(0), notifyGroup: z.enum(['SENIOR', 'FINANCE']).default('SENIOR') });
/** Workflow rules (items 205, 208, 210). Senior management only. Fixed catalog; a rule only notifies. */
export const GET = handle(async () => { const s = await actorOf(); if (!(await isSeniorManagement(s))) throw new ApiError(403, 'للإدارة العليا فقط'); return json({ rules: await prisma.$queryRawUnsafe(`SELECT "event_kind","enabled","threshold_days","notify_group" FROM "office_workflow_rules" ORDER BY "event_kind"`) }); });
export const PUT = handle(async (req: Request) => {
  const s = await actorOf(); if (!(await isSeniorManagement(s))) throw new ApiError(403, 'للإدارة العليا فقط'); const i = await readJson(req, put);
  await prisma.$executeRawUnsafe(`INSERT INTO "office_workflow_rules" ("id","event_kind","enabled","threshold_days","notify_group","updated_by") VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT ("event_kind") DO UPDATE SET "enabled"=$3,"threshold_days"=$4,"notify_group"=$5,"updated_by"=$6,"updated_at"=NOW()`, 'wfr_' + crypto.randomUUID().replaceAll('-', ''), i.eventKind, i.enabled, i.thresholdDays, i.notifyGroup, s.role === 'admin' ? 'admin:' + s.userId : 'lawyer:' + s.lawyerId);
  await logAuditEvent({ actorUserId: s.role === 'admin' ? s.userId : null, actorLawyerId: s.role === 'lawyer' ? s.lawyerId : null, action: 'WORKFLOW_RULE_SET', resourceType: 'workflow', resourceId: i.eventKind, summary: (i.enabled ? 'on ' : 'off ') + i.eventKind });
  return json({ ok: true });
});
