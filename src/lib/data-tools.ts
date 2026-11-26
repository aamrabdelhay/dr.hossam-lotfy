import 'server-only';
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import type { SessionUser } from '@/lib/auth';
import { filterAccessibleCases } from '@/lib/case-file-access';
import { logAuditEvent } from '@/lib/audit';
import { recordUndo } from '@/lib/personal-workspace';

const rid = (p: string) => p + '_' + crypto.randomUUID().replaceAll('-', '');
export const normPhone = (p?: string | null) => { const d = (p || '').replace(/\D/g, ''); return d.length >= 8 ? d.slice(-10) : ''; };

// Item 95: completeness score. Counts filled fields only; never returns the values.
const FIELDS = ['name', 'phone', 'email', 'nationalId', 'address'] as const;
export function completeness(c: Record<string, unknown>) {
  const missing = FIELDS.filter((f) => !String(c[f] ?? '').trim());
  return { score: Math.round(((FIELDS.length - missing.length) / FIELDS.length) * 100), missing };
}

// Items 83 and 96: data-quality center. Read-only report. Lists ids and names, no contact values.
export async function dataQualityReport(session: SessionUser, branchIds: string[] | null) {
  const clients = await prisma.$queryRawUnsafe<any[]>(
    `SELECT "id","name","phone","email","nationalId","address" FROM "clients" WHERE COALESCE("status",'MAIN') NOT IN ('DELETED','MERGED') AND ($1::text[] IS NULL OR COALESCE("branch_id",'branch_main')=ANY($1::text[])) LIMIT 5000`, branchIds);
  const incomplete = clients.map((c) => ({ id: c.id, name: c.name, ...completeness(c) })).filter((c) => c.score < 60).slice(0, 50);
  const byPhone = new Map<string, any[]>();
  for (const c of clients) { const k = normPhone(c.phone); if (k) byPhone.set(k, [...(byPhone.get(k) || []), { id: c.id, name: c.name }]); }
  const duplicates = [...byPhone.values()].filter((g) => g.length > 1).slice(0, 50);
  const cases = await prisma.$queryRawUnsafe<any[]>(
    `SELECT c."id",c."name",c."number" FROM "case_records" c WHERE NOT EXISTS (SELECT 1 FROM "case_clients" cc WHERE cc."case_id"=c."id") AND c."clientId" IS NULL ORDER BY c."name" LIMIT 200`);
  const casesNoClient = (await filterAccessibleCases(session, cases)).slice(0, 50);
  const noSessions = await prisma.$queryRawUnsafe<any[]>(
    `SELECT c."id",c."name",c."number" FROM "case_records" c WHERE NOT EXISTS (SELECT 1 FROM "tasks" t WHERE t."caseId"=c."id") ORDER BY c."name" LIMIT 200`);
  const casesNoSessions = (await filterAccessibleCases(session, noSessions)).slice(0, 50);
  const unassigned = await prisma.$queryRawUnsafe<any[]>(
    `SELECT t."id",t."description",t."caseId" FROM "tasks" t WHERE t."status" IN ('PENDING','IN_PROGRESS') AND NOT EXISTS (SELECT 1 FROM "task_assignments" a WHERE a."taskId"=t."id") ORDER BY t."createdAt" DESC LIMIT 200`);
  const withCase = unassigned.filter((t) => t.caseId);
  const okCases = new Set((await filterAccessibleCases(session, withCase.map((t) => ({ id: t.caseId })))).map((c) => c.id));
  const tasksUnassigned = unassigned.filter((t) => !t.caseId || okCases.has(t.caseId)).slice(0, 50).map((t) => ({ id: t.id, description: t.description }));
  return { incompleteClients: incomplete, duplicatePhoneGroups: duplicates, casesWithoutClient: casesNoClient, casesWithoutSessions: casesNoSessions, openTasksWithoutAssignee: tasksUnassigned, note: 'Report only. Nothing is changed automatically.' };
}

// Item 97: merge duplicate clients. Senior only (checked by the route). Nothing is deleted: the duplicate is marked MERGED.
const REPOINT = [['case_clients', 'client_id'], ['client_events', 'client_id'], ['client_files', 'client_id'], ['client_appointments', 'client_id']] as const;
export async function mergeClients(session: SessionUser, primaryId: string, secondaryId: string, dryRun: boolean, allowCrossBranch = false) {
  if (primaryId === secondaryId) return { ok: false as const, error: 'same-client' };
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "clients" WHERE "id" = ANY($1::text[])`, [primaryId, secondaryId]);
  const p = rows.find((r) => r.id === primaryId), s = rows.find((r) => r.id === secondaryId);
  if (!p || !s) return { ok: false as const, error: 'not-found' };
  if (['MERGED', 'DELETED'].includes(s.status) || ['MERGED', 'DELETED'].includes(p.status)) return { ok: false as const, error: 'already-merged-or-deleted' };
  const bp = p.branch_id || 'branch_main', bs = s.branch_id || 'branch_main';
  const crossBranch = bp !== bs;
  if (crossBranch && !allowCrossBranch && !dryRun) return { ok: false as const, error: 'cross-branch-needs-explicit-confirmation' };
  const secCases = await prisma.$queryRawUnsafe<any[]>(`SELECT DISTINCT c."id" FROM "case_records" c LEFT JOIN "case_clients" cc ON cc."case_id"=c."id" WHERE c."clientId"=$1 OR cc."client_id"=$1`, secondaryId);
  const sec = secCases.length ? await prisma.$queryRawUnsafe<any[]>(`SELECT "classification","ethical_wall_enabled" FROM "office_case_security" WHERE "case_id" = ANY($1::text[])`, secCases.map((r) => r.id)) : [];
  const caseImpact = { cases: secCases.length, withEthicalWall: sec.filter((r) => r.ethical_wall_enabled).length, highlyConfidential: sec.filter((r) => r.classification === 'HIGHLY_CONFIDENTIAL').length, confidential: sec.filter((r) => r.classification === 'CONFIDENTIAL').length };
  const counts: Record<string, number> = {};
  for (const [t, c] of REPOINT) counts[t] = Number((await prisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int AS n FROM "${t}" WHERE "${c}"=$1`, secondaryId))[0].n);
  counts.case_records = Number((await prisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int AS n FROM "case_records" WHERE "clientId"=$1`, secondaryId))[0].n);
  const fill = (['phone', 'email', 'nationalId', 'address'] as const).filter((f) => !String(p[f] ?? '').trim() && String(s[f] ?? '').trim());
  if (dryRun) return { ok: true as const, dryRun: true, crossBranch, primaryBranch: bp, secondaryBranch: bs, caseImpact, note: 'Case classification and ethical walls stay on the cases and are not changed by a merge. Only the client link moves. Cross-branch merges need explicit confirmation.', willMove: counts, willFillEmptyFields: fill, secondaryWillBecome: 'MERGED' };
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`UPDATE "case_records" SET "clientId"=$1 WHERE "clientId"=$2`, primaryId, secondaryId);
    await tx.$executeRawUnsafe(`INSERT INTO "case_clients" ("id","case_id","client_id") SELECT 'cc_'||md5("case_id"||':'||$1),"case_id",$1 FROM "case_clients" WHERE "client_id"=$2 ON CONFLICT ("case_id","client_id") DO NOTHING`, primaryId, secondaryId);
    await tx.$executeRawUnsafe(`DELETE FROM "case_clients" WHERE "client_id"=$1`, secondaryId); // link rows only; the cases themselves are untouched
    for (const t of ['client_events', 'client_files', 'client_appointments']) await tx.$executeRawUnsafe(`UPDATE "${t}" SET "client_id"=$1 WHERE "client_id"=$2`, primaryId, secondaryId);
    for (const f of fill) await tx.$executeRawUnsafe(`UPDATE "clients" SET "${f}"=$2 WHERE "id"=$1`, primaryId, s[f]);
    await tx.$executeRawUnsafe(`UPDATE "clients" SET "status"='MERGED',"notes"=COALESCE("notes",'')||$2 WHERE "id"=$1`, secondaryId, `\n[merged into ${primaryId}]`);
    await tx.$executeRawUnsafe(`INSERT INTO "client_events" ("id","client_id","description","type","author_name") VALUES ($1,$2,$3,'merge',$4)`, rid('ce'), primaryId, `Merged duplicate client ${secondaryId} into this record`, session.name);
  });
  await logAuditEvent({ actorUserId: session.role === 'admin' ? session.userId : null, actorLawyerId: session.role === 'lawyer' ? session.lawyerId : null, action: 'CLIENT_MERGE', resourceType: 'client', resourceId: primaryId, summary: 'Merged duplicate client records', metadata: { crossBranch, caseImpact, secondaryId, moved: counts, filled: fill } });
  return { ok: true as const, dryRun: false, moved: counts, filled: fill };
}

// Item 80: bulk edit tasks with a field whitelist. Completion is excluded on purpose (it has its own approval flow).
export const BULK_STATUSES = ['PENDING', 'IN_PROGRESS', 'CANCELLED'] as const;
export async function bulkEditTasks(session: SessionUser, ids: string[], patch: { status?: string; scheduledDate?: string | null; scheduledTime?: string | null }, dryRun: boolean) {
  const tasks = await prisma.task.findMany({ where: { id: { in: ids } } });
  const found = new Set(tasks.map((t) => t.id));
  const withCase = tasks.filter((t) => t.caseId);
  const allowedCases = new Set((await filterAccessibleCases(session, withCase.map((t) => ({ id: t.caseId as string })))).map((c) => c.id));
  const editable = tasks.filter((t) => t.status !== 'COMPLETED' && (!t.caseId || allowedCases.has(t.caseId)));
  const skipped = ids.map((id) => ({ id, reason: !found.has(id) ? 'not-found' : !editable.some((t) => t.id === id) ? 'completed-or-no-access' : '' })).filter((x) => x.reason);
  if (dryRun) return { dryRun: true, wouldChange: editable.map((t) => t.id), skipped };
  for (const t of editable) {
    await recordUndo(session, 'task', t.id, 'تعديل جماعي: ' + t.description.slice(0, 60), { description: t.description, notes: t.notes, scheduledDate: t.scheduledDate ? t.scheduledDate.toISOString().slice(0, 10) : null, scheduledTime: t.scheduledTime, status: t.status });
    await prisma.task.update({ where: { id: t.id }, data: { ...(patch.status ? { status: patch.status as never } : {}), ...(patch.scheduledDate !== undefined ? { scheduledDate: patch.scheduledDate ? new Date(`${patch.scheduledDate}T00:00:00`) : null } : {}), ...(patch.scheduledTime !== undefined ? { scheduledTime: patch.scheduledTime } : {}) } });
  }
  await logAuditEvent({ actorUserId: session.role === 'admin' ? session.userId : null, actorLawyerId: session.role === 'lawyer' ? session.lawyerId : null, action: 'TASK_BULK_EDIT', resourceType: 'task', summary: `Bulk edit of ${editable.length} tasks`, metadata: { count: editable.length, fields: Object.keys(patch) } });
  return { dryRun: false, changed: editable.map((t) => t.id), skipped };
}

// Item 81: copy a task as a new pending item (no date, no assignees, no completion state).
export async function copyTask(session: SessionUser, id: string) {
  const t = await prisma.task.findUnique({ where: { id } });
  if (!t) return null;
  if (t.caseId && (await filterAccessibleCases(session, [{ id: t.caseId }])).length === 0) return null;
  const n = await prisma.task.create({ data: { locationId: t.locationId, caseId: t.caseId, description: t.description, notes: t.notes, status: 'PENDING', createdById: session.role === 'admin' ? session.userId : null, authorId: session.role === 'lawyer' ? session.lawyerId : null } });
  await logAuditEvent({ actorUserId: session.role === 'admin' ? session.userId : null, actorLawyerId: session.role === 'lawyer' ? session.lawyerId : null, action: 'TASK_COPY', resourceType: 'task', resourceId: n.id, summary: 'Copied a task', metadata: { from: id } });
  return n.id;
}
