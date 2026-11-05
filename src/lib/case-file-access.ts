import 'server-only';
import { ApiError, requirePermission, user } from '@/lib/api';
import { getBranchScope } from '@/lib/branch-access';
import { isSeniorManagement } from '@/lib/office-workflow';
import { prisma } from '@/lib/prisma';
import type { SessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

type CaseRow = { id: string; branch_id: string };
type SecurityRow = { case_id: string; classification: string; ethical_wall_enabled: boolean };
type GrantRow = { case_id: string; access_level: string };
export type CaseAccess = {
  session: SessionUser;
  caseRow: CaseRow;
  grantLevel: 'VIEW' | 'EDIT' | null;
  isAssigned: boolean;
  canRequestChanges: boolean;
};

function isSensitive(row?: SecurityRow) {
  return Boolean(row?.ethical_wall_enabled || row?.classification === 'HIGHLY_CONFIDENTIAL');
}

async function snapshot(session: SessionUser, caseIds: string[]) {
  const ids = Array.from(new Set(caseIds.filter(Boolean)));
  if (!ids.length) return { visible: new Set<string>(), details: new Map<string, CaseAccess>() };
  const [rows, scope, senior] = await Promise.all([
    prisma.$queryRawUnsafe<CaseRow[]>(
      'SELECT "id",COALESCE("branch_id",$2) AS "branch_id" FROM "case_records" WHERE "id"=ANY($1::text[])',
      ids, 'branch_main',
    ),
    getBranchScope(session),
    isSeniorManagement(session),
  ]);
  const found = rows.map((row) => row.id);
  if (!found.length) return { visible: new Set<string>(), details: new Map<string, CaseAccess>() };

  const userId = session.role === 'admin' ? session.userId : null;
  const lawyerId = session.role === 'lawyer' ? session.lawyerId : null;
  const [securityRows, grantRows, assignedRows] = await Promise.all([
    prisma.$queryRawUnsafe<SecurityRow[]>(
      'SELECT "case_id","classification","ethical_wall_enabled" FROM "office_case_security" WHERE "case_id"=ANY($1::text[])',
      found,
    ),
    prisma.$queryRawUnsafe<GrantRow[]>(
      'SELECT "case_id","access_level" FROM "office_case_access_grants" WHERE "case_id"=ANY($1::text[]) AND (("user_id"=$2 AND $2 IS NOT NULL) OR ("lawyer_id"=$3 AND $3 IS NOT NULL))',
      found, userId, lawyerId,
    ),
    lawyerId
      ? prisma.$queryRawUnsafe<Array<{ caseId: string }>>(
          'SELECT DISTINCT t."caseId" AS "caseId" FROM "tasks" t INNER JOIN "task_assignments" ta ON ta."taskId"=t."id" WHERE t."caseId"=ANY($1::text[]) AND ta."lawyerId"=$2',
          found, lawyerId,
        )
      : Promise.resolve([]),
  ]);
  const security = new Map(securityRows.map((row) => [row.case_id, row]));
  const grants = new Map(grantRows.map((row) => [row.case_id, row.access_level as 'VIEW' | 'EDIT']));
  const assigned = new Set(assignedRows.map((row) => row.caseId));
  const visible = new Set<string>();
  const details = new Map<string, CaseAccess>();

  for (const row of rows) {
    const policy = security.get(row.id);
    const grant = grants.get(row.id) || null;
    const isAssigned = assigned.has(row.id);
    const sensitive = isSensitive(policy);
    let allowed = false;
    if (senior || grant) allowed = true;
    else if (sensitive) allowed = false;
    else if (policy?.classification === 'CONFIDENTIAL') {
      allowed = isAssigned || scope.officeManagerBranchIds.includes(row.branch_id);
    } else if (session.role === 'admin') {
      allowed = scope.allBranches
        || (!scope.officeManagerBranchIds.length && !scope.financeManagerBranchIds.length)
        || scope.branchIds.includes(row.branch_id);
    } else {
      allowed = scope.branchIds.includes(row.branch_id) || isAssigned;
    }
    if (!allowed) continue;

    visible.add(row.id);
    const canRequestChanges = senior || grant === 'EDIT'
      || (!sensitive && (
        isAssigned
        || (session.role === 'admin' && (
          scope.allBranches
          || (!scope.officeManagerBranchIds.length && !scope.financeManagerBranchIds.length)
          || scope.branchIds.includes(row.branch_id)
        ))
        || scope.officeManagerBranchIds.includes(row.branch_id)
      ));
    details.set(row.id, { session, caseRow: row, grantLevel: grant, isAssigned, canRequestChanges });
  }
  return { visible, details };
}

export async function filterAccessibleCases<T extends { id: string }>(session: SessionUser, cases: T[]) {
  const result = await snapshot(session, cases.map((row) => row.id));
  return cases.filter((row) => result.visible.has(row.id));
}

export async function requireCaseFileAccess(caseId: string): Promise<CaseAccess> {
  const session = await user();
  if (!session) throw new ApiError(401, 'يجب تسجيل الدخول لفتح ملف القضية');
  if (session.role === 'admin') await requirePermission('viewAdmin');
  const result = await snapshot(session, [caseId]);
  const access = result.details.get(caseId);
  if (!access) {
    const exists = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      'SELECT "id" FROM "case_records" WHERE "id"=$1 LIMIT 1', caseId,
    );
    if (!exists.length) throw new ApiError(404, 'القضية غير موجودة');
    throw new ApiError(403, 'لا تملك صلاحية الوصول إلى هذه القضية');
  }
  await logAuditEvent({ actorUserId: session.role === 'admin' ? session.userId : null, actorLawyerId: session.role === 'lawyer' ? session.lawyerId : null, action: 'CASE_ACCESS_GRANTED', resourceType: 'case', resourceId: caseId, summary: 'تم الوصول إلى ملف قضية: ' + access.caseRow.id });
  return access;
}
