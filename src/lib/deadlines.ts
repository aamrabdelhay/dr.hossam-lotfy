import 'server-only';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { SessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { addPeriod, daysBetween } from '@/lib/deadlines-core';
import { todayCairo } from '@/lib/hearings';

const aid = (s: SessionUser) => ({ actorUserId: s.role === 'admin' ? s.userId : null, actorLawyerId: s.role === 'lawyer' ? s.lawyerId : null });
const who = (s: SessionUser) => (s.role === 'admin' ? `admin:${s.userId}` : `lawyer:${s.lawyerId}`);
export const NOTICE = 'تاريخ مساعد فقط. لا يراعي العطلات الرسمية ولا الإجازات القضائية. يجب أن يراجعه المحامي المسؤول قبل الاعتماد عليه.';
export const ruleSchema = z.object({ name: z.string().trim().min(2).max(200), unit: z.enum(['DAYS', 'MONTHS', 'YEARS']), amount: z.number().int().min(1).max(3650), sourceRef: z.string().trim().min(5).max(400) });
export const deadlineSchema = z.object({ ruleId: z.string().min(1), startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), note: z.string().max(500).optional() });
export const statusSchema = z.object({ deadlineId: z.string().min(1), status: z.enum(['OPEN', 'DONE', 'CANCELLED']) });

export const listRules = () => prisma.$queryRawUnsafe<{ id: string; name: string; unit: string; amount: number; source_ref: string; active: boolean }[]>(`SELECT "id","name","unit","amount","source_ref","active" FROM "office_deadline_rules" WHERE "active" ORDER BY "name"`);
export async function createRule(s: SessionUser, input: z.infer<typeof ruleSchema>) {
  const id = 'dlr_' + crypto.randomUUID().replaceAll('-', '');
  await prisma.$executeRawUnsafe(`INSERT INTO "office_deadline_rules" ("id","name","unit","amount","source_ref","created_by") VALUES ($1,$2,$3,$4,$5,$6)`, id, input.name, input.unit, input.amount, input.sourceRef, who(s));
  await logAuditEvent({ ...aid(s), action: 'DEADLINE_RULE_CREATED', resourceType: 'deadline_rule', resourceId: id, summary: 'قاعدة مهلة: ' + input.name, metadata: { sourceRef: input.sourceRef } });
  return { id };
}
export async function calc(ruleId: string, startDate: string) {
  const r = (await prisma.$queryRawUnsafe<{ id: string; name: string; unit: 'DAYS' | 'MONTHS' | 'YEARS'; amount: number; source_ref: string }[]>(`SELECT "id","name","unit","amount","source_ref" FROM "office_deadline_rules" WHERE "id"=$1 AND "active"`, ruleId))[0];
  if (!r) return null;
  return { rule: r, startDate, dueDate: addPeriod(startDate, r.unit, r.amount), notice: NOTICE };
}
export async function addDeadline(s: SessionUser, caseId: string, input: z.infer<typeof deadlineSchema>) {
  const c = await calc(input.ruleId, input.startDate); if (!c) return { error: 'قاعدة المهلة غير موجودة' } as const;
  const id = 'dl_' + crypto.randomUUID().replaceAll('-', '');
  await prisma.$executeRawUnsafe(`INSERT INTO "office_case_deadlines" ("id","case_id","rule_id","start_date","due_date","note","created_by") VALUES ($1,$2,$3,$4::date,$5::date,$6,$7)`, id, caseId, input.ruleId, input.startDate, c.dueDate, input.note ?? null, who(s));
  await logAuditEvent({ ...aid(s), action: 'CASE_DEADLINE_ADDED', resourceType: 'case', resourceId: caseId, summary: 'مهلة قانونية: ' + c.rule.name + ' تنتهي ' + c.dueDate, metadata: { deadlineId: id, ruleId: input.ruleId } });
  return { id, dueDate: c.dueDate, notice: NOTICE } as const;
}
export async function listDeadlines(caseId: string) {
  const rows = await prisma.$queryRawUnsafe<{ id: string; rule_name: string; source_ref: string; start_date: string; due_date: string; note: string | null; status: string }[]>(
    `SELECT d."id", r."name" AS rule_name, r."source_ref", to_char(d."start_date",'YYYY-MM-DD') AS start_date, to_char(d."due_date",'YYYY-MM-DD') AS due_date, d."note", d."status"
       FROM "office_case_deadlines" d JOIN "office_deadline_rules" r ON r."id"=d."rule_id" WHERE d."case_id"=$1 ORDER BY d."due_date"`, caseId);
  const today = todayCairo();
  return rows.map((r) => ({ ...r, daysLeft: daysBetween(today, r.due_date), overdue: r.status === 'OPEN' && r.due_date < today }));
}
export async function setDeadlineStatus(s: SessionUser, caseId: string, input: z.infer<typeof statusSchema>) {
  const n = await prisma.$executeRawUnsafe(`UPDATE "office_case_deadlines" SET "status"=$1 WHERE "id"=$2 AND "case_id"=$3`, input.status, input.deadlineId, caseId);
  if (!n) return { error: 'not-found' } as const;
  await logAuditEvent({ ...aid(s), action: 'CASE_DEADLINE_STATUS', resourceType: 'case', resourceId: caseId, summary: 'حالة المهلة ' + input.status, metadata: { deadlineId: input.deadlineId } });
  return { ok: true } as const;
}
