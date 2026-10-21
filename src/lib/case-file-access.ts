import 'server-only';

import { ApiError, requirePermission, user } from '@/lib/api';
import { getBranchScope } from '@/lib/branch-access';
import { isSeniorManagement } from '@/lib/office-workflow';
import { prisma } from '@/lib/prisma';

export async function requireCaseFileAccess(caseId: string) {
  const session = await user();
  if (!session) throw new ApiError(401, 'يجب تسجيل الدخول لفتح ملفات القضية');

  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; branch_id: string }>>(
    `SELECT "id", COALESCE("branch_id", 'branch_main') AS "branch_id"
       FROM "case_records" WHERE "id" = $1 LIMIT 1`,
    caseId,
  );
  const caseRow = rows[0];
  if (!caseRow) throw new ApiError(404, 'القضية غير موجودة');

  const scope = await getBranchScope(session);
  if (session.role === 'admin') {
    await requirePermission('viewAdmin');
    if (
      scope.allBranches ||
      (!scope.officeManager && !scope.financeManager) ||
      scope.branchIds.includes(caseRow.branch_id)
    ) {
      return { session, caseRow };
    }
    throw new ApiError(403, 'ليس لديك صلاحية الوصول إلى ملفات هذه القضية');
  }

  if (await isSeniorManagement(session)) return { session, caseRow };
  if (scope.branchIds.includes(caseRow.branch_id)) return { session, caseRow };

  const assignedTasks = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT t."id"
       FROM "tasks" t
       INNER JOIN "task_assignments" ta ON ta."taskId" = t."id"
       WHERE t."caseId" = $1 AND ta."lawyerId" = $2
       LIMIT 1`,
    caseId,
    session.lawyerId,
  );
  if (assignedTasks.length) return { session, caseRow };

  throw new ApiError(403, 'لا تملك صلاحية الوصول إلى ملفات هذه القضية');
}
