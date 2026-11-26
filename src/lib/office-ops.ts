import 'server-only';
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import type { SessionUser } from '@/lib/auth';
import { filterAccessibleCases } from '@/lib/case-file-access';
import { getBranchScope } from '@/lib/branch-access';
import { logAuditEvent } from '@/lib/audit';

const rid = (p: string) => p + '_' + crypto.randomUUID().replaceAll('-', '');
const aid = (s: SessionUser) => ({ actorUserId: s.role === 'admin' ? s.userId : null, actorLawyerId: s.role === 'lawyer' ? s.lawyerId : null });
const who = (s: SessionUser) => (s.role === 'admin' ? `admin:${s.userId}` : `lawyer:${s.lawyerId}`);
// Branch limits come from the REAL signed-in person (a lawyer who manages a branch), never from the derived admin session,
// which loses the lawyer link. null = all branches (senior). Branch managers get their branches. Anyone else gets none.
export async function branchFilter(s: SessionUser): Promise<string[] | null> {
  const sc = await getBranchScope(s);
  if (sc.allBranches) return null;
  if (sc.officeManagerBranchIds.length) return sc.officeManagerBranchIds;
  return s.role === 'admin' ? null : ['__none__']; // account-based admin roles keep the existing behaviour
}

// Item 91: task templates + checklists
export async function saveTemplate(s: SessionUser, t: { name: string; description: string; notes?: string; checklist: string[] }) {
  await prisma.$executeRawUnsafe(`INSERT INTO "office_task_templates" ("id","name","description","notes","checklist","created_by") VALUES ($1,$2,$3,$4,$5::jsonb,$6)
    ON CONFLICT ("name") DO UPDATE SET "description"=EXCLUDED."description","notes"=EXCLUDED."notes","checklist"=EXCLUDED."checklist"`, rid('tpl'), t.name, t.description, t.notes ?? null, JSON.stringify(t.checklist), who(s));
}
export const listTemplates = () => prisma.$queryRawUnsafe<any[]>(`SELECT "id","name","description","notes","checklist" FROM "office_task_templates" ORDER BY "name" LIMIT 200`);
export async function instantiateTemplate(s: SessionUser, templateId: string, o: { locationId: string; caseId?: string | null; scheduledDate?: string | null }) {
  const [tpl] = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "office_task_templates" WHERE "id"=$1`, templateId);
  if (!tpl) return { error: 'template-not-found' as const };
  if (o.caseId && (await filterAccessibleCases(s, [{ id: o.caseId }])).length === 0) return { error: 'no-case-access' as const };
  const loc = await prisma.location.findUnique({ where: { id: o.locationId } });
  if (!loc) return { error: 'location-not-found' as const };
  const task = await prisma.task.create({ data: { locationId: o.locationId, caseId: o.caseId ?? null, description: tpl.description, notes: tpl.notes, status: 'PENDING', scheduledDate: o.scheduledDate ? new Date(`${o.scheduledDate}T00:00:00`) : null, createdById: s.role === 'admin' ? s.userId : null, authorId: s.role === 'lawyer' ? s.lawyerId : null } });
  const items: string[] = tpl.checklist;
  for (let i = 0; i < items.length; i++) await prisma.$executeRawUnsafe(`INSERT INTO "office_task_checklist_items" ("id","task_id","position","text") VALUES ($1,$2,$3,$4)`, rid('chk'), task.id, i, items[i]);
  await logAuditEvent({ ...aid(s), action: 'TASK_FROM_TEMPLATE', resourceType: 'task', resourceId: task.id, summary: 'Task created from template', metadata: { templateId } });
  return { taskId: task.id };
}
async function taskAllowed(s: SessionUser, taskId: string) {
  const t = await prisma.task.findUnique({ where: { id: taskId }, select: { caseId: true } });
  if (!t) return false;
  return !t.caseId || (await filterAccessibleCases(s, [{ id: t.caseId }])).length > 0;
}
export async function getChecklist(s: SessionUser, taskId: string) {
  if (!(await taskAllowed(s, taskId))) return null;
  return prisma.$queryRawUnsafe<any[]>(`SELECT "id","position","text","done_at" AS "doneAt" FROM "office_task_checklist_items" WHERE "task_id"=$1 ORDER BY "position"`, taskId);
}
export async function toggleChecklist(s: SessionUser, itemId: string, done: boolean) {
  const [it] = await prisma.$queryRawUnsafe<any[]>(`SELECT "task_id" FROM "office_task_checklist_items" WHERE "id"=$1`, itemId);
  if (!it || !(await taskAllowed(s, it.task_id))) return false;
  await prisma.$executeRawUnsafe(`UPDATE "office_task_checklist_items" SET "done_at"=${done ? 'NOW()' : 'NULL'},"done_by"=${done ? '$2' : 'NULL'} WHERE "id"=$1`, ...(done ? [itemId, who(s)] : [itemId]));
  return true;
}

// Item 94: atomic numbering. QR codes need a QR library that is not in package.json: reported as pending, not faked.
export const NUMBER_SCOPES = { case: 'CASE', client: 'CLT', document: 'DOC' } as const;
export async function nextNumber(scope: keyof typeof NUMBER_SCOPES, year = new Date().getFullYear()) {
  const [r] = await prisma.$queryRawUnsafe<{ last_value: number }[]>(
    `INSERT INTO "office_number_counters" ("scope","year","last_value") VALUES ($1,$2,1) ON CONFLICT ("scope","year") DO UPDATE SET "last_value"="office_number_counters"."last_value"+1 RETURNING "last_value"`, scope, year);
  return `${NUMBER_SCOPES[scope]}-${year}-${String(r.last_value).padStart(5, '0')}`;
}

// Item 98: shared courts dictionary (starts empty; the office enters its own list, nothing invented)
export const listCourts = (activeOnly = true) => prisma.$queryRawUnsafe<any[]>(`SELECT "id","name","city","governorate","active" FROM "office_courts" WHERE ($1::boolean=false OR "active") ORDER BY "governorate","city","name" LIMIT 500`, activeOnly);
export async function saveCourt(s: SessionUser, c: { name: string; city?: string; governorate?: string }) {
  await prisma.$executeRawUnsafe(`INSERT INTO "office_courts" ("id","name","city","governorate") VALUES ($1,$2,$3,$4) ON CONFLICT ("name","city") DO UPDATE SET "governorate"=EXCLUDED."governorate","active"=TRUE`, rid('crt'), c.name, c.city ?? '', c.governorate ?? null);
  await logAuditEvent({ ...aid(s), action: 'COURT_SAVE', resourceType: 'court', summary: 'Court dictionary entry saved' });
}
export const deactivateCourt = (id: string) => prisma.$executeRawUnsafe(`UPDATE "office_courts" SET "active"=FALSE WHERE "id"=$1`, id); // never deleted

// Item 56: waitlist. Matching only suggests. A person decides and contacts the client. Nothing is booked or sent automatically.
export async function addWaitlist(s: SessionUser, w: { clientId: string; fromDate: string; toDate: string; notes?: string }) {
  const bf = await branchFilter(s);
  const [c] = await prisma.$queryRawUnsafe<any[]>(`SELECT "id","branch_id","status" FROM "clients" WHERE "id"=$1`, w.clientId);
  if (!c || ['DELETED', 'MERGED', 'REJECTED'].includes(c.status)) return { error: 'client-not-found' as const };
  const branch = c.branch_id || 'branch_main';
  if (bf && !bf.includes(branch)) return { error: 'wrong-branch' as const };
  const id = rid('wl');
  await prisma.$executeRawUnsafe(`INSERT INTO "office_waitlist" ("id","client_id","branch_id","from_date","to_date","notes","created_by") VALUES ($1,$2,$3,$4::date,$5::date,$6,$7)`, id, w.clientId, branch, w.fromDate, w.toDate, w.notes ?? null, who(s));
  return { id };
}
export async function listWaitlist(s: SessionUser) {
  const bf = await branchFilter(s);
  return prisma.$queryRawUnsafe<any[]>(`SELECT w."id",w."client_id" AS "clientId",c."name" AS "clientName",w."branch_id" AS "branchId",to_char(w."from_date",'YYYY-MM-DD') AS "fromDate",to_char(w."to_date",'YYYY-MM-DD') AS "toDate",w."status",w."notes" FROM "office_waitlist" w JOIN "clients" c ON c."id"=w."client_id" WHERE ($1::text[] IS NULL OR w."branch_id"=ANY($1::text[])) AND w."status" IN ('WAITING','OFFERED') ORDER BY w."created_at" LIMIT 200`, bf);
}
export async function waitlistMatches(s: SessionUser, date: string, branchId: string) {
  const bf = await branchFilter(s);
  if (bf && !bf.includes(branchId)) return [];
  return prisma.$queryRawUnsafe<any[]>(`SELECT w."id",w."client_id" AS "clientId",c."name" AS "clientName" FROM "office_waitlist" w JOIN "clients" c ON c."id"=w."client_id" WHERE w."branch_id"=$2 AND w."status"='WAITING' AND $1::date BETWEEN w."from_date" AND w."to_date" ORDER BY w."created_at" LIMIT 20`, date, branchId);
}
export async function setWaitlistStatus(s: SessionUser, id: string, status: 'OFFERED' | 'BOOKED' | 'CANCELLED') {
  const bf = await branchFilter(s);
  return (await prisma.$executeRawUnsafe(`UPDATE "office_waitlist" SET "status"=$2 WHERE "id"=$1 AND ($3::text[] IS NULL OR "branch_id"=ANY($3::text[]))`, id, status, bf)) > 0;
}

// Item 57: no-show history. Recorded separately; the appointment itself is not altered.
export async function markNoShow(s: SessionUser, appointmentId: string, note?: string) {
  const bf = await branchFilter(s);
  const [a] = await prisma.$queryRawUnsafe<any[]>(`SELECT "id","client_id","branch_id","appointment_date" FROM "client_appointments" WHERE "id"=$1`, appointmentId);
  if (!a) return { error: 'not-found' as const };
  if (bf && !bf.includes(a.branch_id || 'branch_main')) return { error: 'wrong-branch' as const };
  if (new Date(a.appointment_date) > new Date()) return { error: 'future-appointment' as const };
  await prisma.$executeRawUnsafe(`INSERT INTO "office_no_shows" ("id","appointment_id","client_id","note","marked_by") VALUES ($1,$2,$3,$4,$5) ON CONFLICT ("appointment_id") DO NOTHING`, rid('ns'), appointmentId, a.client_id, note ?? null, who(s));
  await logAuditEvent({ ...aid(s), action: 'APPOINTMENT_NO_SHOW', resourceType: 'client_appointment', resourceId: appointmentId, summary: 'Appointment marked as no-show' });
  return { ok: true as const };
}
export async function noShowHistory(s: SessionUser, clientId: string) {
  const bf = await branchFilter(s);
  const [c] = await prisma.$queryRawUnsafe<any[]>(`SELECT "branch_id" FROM "clients" WHERE "id"=$1`, clientId);
  if (!c || (bf && !bf.includes(c.branch_id || 'branch_main'))) return null;
  return prisma.$queryRawUnsafe<any[]>(`SELECT "appointment_id" AS "appointmentId","note","marked_at" AS "markedAt" FROM "office_no_shows" WHERE "client_id"=$1 ORDER BY "marked_at" DESC LIMIT 50`, clientId);
}

// Item 93: WhatsApp message templates. Produces text and a wa.me link only. The app never sends anything.
const WA_FIELDS = ['clientName', 'date', 'time', 'branch', 'officeName'] as const;
export const listWaTemplates = () => prisma.$queryRawUnsafe<any[]>(`SELECT "id","name","body" FROM "office_wa_templates" WHERE "active" ORDER BY "name" LIMIT 200`);
export async function saveWaTemplate(s: SessionUser, t: { name: string; body: string }) {
  const bad = [...t.body.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).filter((k) => !(WA_FIELDS as readonly string[]).includes(k));
  if (bad.length) return { error: 'unknown-fields' as const, fields: bad };
  await prisma.$executeRawUnsafe(`INSERT INTO "office_wa_templates" ("id","name","body","created_by") VALUES ($1,$2,$3,$4)
    ON CONFLICT ("name") DO UPDATE SET "body"=EXCLUDED."body","active"=TRUE`, rid('wat'), t.name, t.body, who(s));
  return { ok: true as const };
}
export async function renderWaTemplate(s: SessionUser, templateId: string, o: { clientId?: string; values?: Record<string, string> }) {
  const [tpl] = await prisma.$queryRawUnsafe<any[]>(`SELECT "body" FROM "office_wa_templates" WHERE "id"=$1 AND "active"`, templateId);
  if (!tpl) return { error: 'template-not-found' as const };
  const vals: Record<string, string> = { ...(o.values ?? {}) };
  let phone: string | null = null;
  if (o.clientId) {
    const [c] = await prisma.$queryRawUnsafe<any[]>(`SELECT "name","phone","branch_id" FROM "clients" WHERE "id"=$1`, o.clientId);
    if (!c) return { error: 'client-not-found' as const };
    const br = await branchFilter(s);
    if (br && c.branch_id && !br.includes(c.branch_id)) return { error: 'no-branch-access' as const };
    vals.clientName = vals.clientName ?? c.name; phone = c.phone;
  }
  const text = String(tpl.body).replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => vals[k] ?? `[${k}]`);
  const digits = (phone ?? '').replace(/\D/g, '');
  return { text, missing: [...text.matchAll(/\[(\w+)\]/g)].map((m) => m[1]), link: digits ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : null, sent: false as const };
}
