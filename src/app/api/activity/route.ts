import { prisma } from '@/lib/prisma';
import { handle, json, requireStaff } from '@/lib/api';
import { hiddenCaseIds } from '@/lib/case-file-access';

export const GET = handle(async (req: Request) => {
  const session = await requireStaff();
  const branchId = new URL(req.url).searchParams.get('branchId')?.trim() || null;
  let where: any = undefined;
  if (branchId) {
    const { getBranchScope } = await import('@/lib/branch-access');
    const scope = await getBranchScope(session);
    if (!scope.allBranches && !scope.branchIds.includes(branchId)) return json({ error: 'غير مصرح لهذا الفرع' }, { status: 403 });
    const [taskRows, lawyerRows] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{ id: string }>>('SELECT "id" FROM "tasks" WHERE "branch_id"=$1', branchId),
      prisma.$queryRawUnsafe<Array<{ id: string }>>('SELECT "lawyer_id" AS "id" FROM "office_branch_lawyers" WHERE "branch_id"=$1', branchId),
    ]);
    where = {
      OR: [
        { taskId: { in: taskRows.map((r) => r.id) } },
        { lawyerId: { in: lawyerRows.map((r) => r.id) } },
      ],
    };
  }
  const hidden = await hiddenCaseIds(session);
  let hiddenTaskIds: string[] = [];
  if (hidden.length) {
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>('SELECT "id" FROM "tasks" WHERE "caseId" = ANY($1::text[])', hidden);
    hiddenTaskIds = rows.map((r) => r.id);
  }
  const limit = 100;
  const activity = await prisma.activityLog.findMany({
    where: {
      AND: [
        ...(where ? [where] : []),
        ...(hiddenTaskIds.length ? [{ OR: [{ taskId: null }, { taskId: { notIn: hiddenTaskIds } }] }] : []),
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      lawyer: { select: { fullName: true, slug: true } },
      byUser: { select: { name: true } },
    },
  });
  return json({ activity });
});
