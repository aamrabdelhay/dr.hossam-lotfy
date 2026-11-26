import 'server-only';
import { prisma } from '@/lib/prisma';

export type ChronoEvent = { at: string; source: 'EVENT' | 'SESSION' | 'REGISTER' | 'DEADLINE' | 'FILE'; title: string; detail?: string | null; ref?: string };
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : String(v));

/** Items 125/126. Case chronology: every dated thing already stored for the case in one list, newest first. Case passport: one summary card. Read only: it invents no events. */
export async function chronology(caseId: string) {
  const [events, sessions, reg, dls, files] = await Promise.all([
    prisma.$queryRawUnsafe<{ at: Date; description: string; type: string }[]>(`SELECT "createdAt" AS at, "description", "type" FROM "case_events" WHERE "caseId"=$1`, caseId),
    prisma.$queryRawUnsafe<{ d: string; t: string | null; description: string; status: string; id: string }[]>(`SELECT to_char("scheduledDate",'YYYY-MM-DD') AS d, "scheduledTime" AS t, "description", "status"::text AS status, "id" FROM "tasks" WHERE "caseId"=$1 AND "scheduledDate" IS NOT NULL`, caseId),
    prisma.$queryRawUnsafe<{ at: Date; kind: string; title: string; status: string; id: string }[]>(`SELECT "created_at" AS at, "kind", "title", "status", "id" FROM "office_case_register" WHERE "case_id"=$1`, caseId),
    prisma.$queryRawUnsafe<{ at: Date; due: string; name: string; status: string; id: string }[]>(`SELECT d."created_at" AS at, to_char(d."due_date",'YYYY-MM-DD') AS due, r."name", d."status", d."id" FROM "office_case_deadlines" d JOIN "office_deadline_rules" r ON r."id"=d."rule_id" WHERE d."case_id"=$1`, caseId).catch(() => []),
    prisma.$queryRawUnsafe<{ at: Date; name: string; id: string }[]>(`SELECT "created_at" AS at, "name", "id" FROM "case_files" WHERE "case_id"=$1 AND "deleted_at" IS NULL`, caseId).catch(() => []),
  ]);
  const out: ChronoEvent[] = [
    ...events.map((e) => ({ at: iso(e.at), source: 'EVENT' as const, title: e.description, detail: e.type })),
    ...sessions.map((s) => ({ at: s.d + 'T' + (s.t ?? '00:00') + ':00', source: 'SESSION' as const, title: s.description, detail: s.status, ref: s.id })),
    ...reg.map((r) => ({ at: iso(r.at), source: 'REGISTER' as const, title: r.title, detail: r.kind + ' / ' + r.status, ref: r.id })),
    ...dls.map((d) => ({ at: d.due + 'T00:00:00', source: 'DEADLINE' as const, title: 'نهاية مهلة: ' + d.name, detail: d.status, ref: d.id })),
    ...files.map((f) => ({ at: iso(f.at), source: 'FILE' as const, title: 'ملف: ' + f.name, ref: f.id })),
  ].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return out;
}
export async function passport(caseId: string) {
  const [c] = await prisma.$queryRawUnsafe<{ name: string; number: string; description: string | null; client_name: string | null; category_id: string | null; workflow_status: string | null }[]>(
    `SELECT "name","number","description","clientName" AS client_name,"category_id","workflow_status" FROM "case_records" WHERE "id"=$1`, caseId);
  if (!c) return null;
  const [n] = await prisma.$queryRawUnsafe<{ upcoming: number; past: number; next_date: string | null; files: number; reg_open: number; dl_open: number; next_dl: string | null }[]>(
    `SELECT (SELECT count(*)::int FROM "tasks" WHERE "caseId"=$1 AND "scheduledDate" >= CURRENT_DATE) AS upcoming,
            (SELECT count(*)::int FROM "tasks" WHERE "caseId"=$1 AND "scheduledDate" < CURRENT_DATE) AS past,
            (SELECT to_char(min("scheduledDate"),'YYYY-MM-DD') FROM "tasks" WHERE "caseId"=$1 AND "scheduledDate" >= CURRENT_DATE) AS next_date,
            (SELECT count(*)::int FROM "case_files" WHERE "case_id"=$1 AND "deleted_at" IS NULL) AS files,
            (SELECT count(*)::int FROM "office_case_register" WHERE "case_id"=$1 AND "status"='OPEN') AS reg_open,
            (SELECT count(*)::int FROM "office_case_deadlines" WHERE "case_id"=$1 AND "status"='OPEN') AS dl_open,
            (SELECT to_char(min("due_date"),'YYYY-MM-DD') FROM "office_case_deadlines" WHERE "case_id"=$1 AND "status"='OPEN') AS next_dl`, caseId);
  return { name: c.name, number: c.number, clientName: c.client_name, categoryId: c.category_id, workflowStatus: c.workflow_status, summary: c.description, upcomingSessions: n.upcoming, pastSessions: n.past, nextSession: n.next_date, files: n.files, openRegisterItems: n.reg_open, openDeadlines: n.dl_open, nextDeadline: n.next_dl };
}
