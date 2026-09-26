import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { user } from '@/lib/api';
import { getBranchScope } from '@/lib/branch-access';

function cairoToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export async function GET(req: Request) {
  const session = await user();
  if (!session) return NextResponse.json({ error: 'يجب تسجيل الدخول' }, { status: 401 });

  const url = new URL(req.url);
  const branchId = url.searchParams.get('branchId')?.trim() || null;
  if (branchId) {
    const scope = await getBranchScope(session);
    if (!scope.allBranches && !scope.branchIds.includes(branchId)) {
      return NextResponse.json({ error: 'لا تملك صلاحية هذا الفرع' }, { status: 403 });
    }
  }

  const today = cairoToday();
  const taskIds = branchId
    ? await prisma.$queryRawUnsafe<string[]>(
        `SELECT "id" FROM "tasks" WHERE COALESCE("branch_id",'branch_main')=$1`,
        branchId,
      )
    : undefined;

  const [lawyers, locations, cases, todayTasks] = await Promise.all([
    branchId
      ? prisma.$queryRawUnsafe<Array<{ id: string; name: string }>>(
          `SELECT l."id",l."fullName" AS "name"
           FROM "lawyers" l
           INNER JOIN "office_branch_lawyers" bl ON bl."lawyer_id"=l."id"
           WHERE bl."branch_id"=$1 AND l."active"=true
           ORDER BY l."fullName"`,
          branchId,
        )
      : prisma.lawyer.findMany({
          where: { active: true },
          orderBy: { fullName: 'asc' },
          take: 100,
          select: { id: true, fullName: true },
        }),
    prisma.location.findMany({ orderBy: { name: 'asc' }, take: 300, select: { id: true, name: true } }),
    branchId
      ? prisma.$queryRawUnsafe<Array<{ id: string; name: string; number: string; clientName: string | null }>>(
          `SELECT "id","name","number","clientName"
           FROM "case_records"
           WHERE COALESCE("branch_id",'branch_main')=$1
           ORDER BY "id" DESC LIMIT 100`,
          branchId,
        )
      : prisma.caseRecord.findMany({
          orderBy: { id: 'desc' },
          take: 100,
          select: { id: true, name: true, number: true, clientName: true },
        }),
    prisma.task.findMany({
      where: {
        ...(taskIds ? { id: { in: taskIds } } : {}),
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
        scheduledDate: new Date(`${today}T00:00:00`),
      },
      orderBy: [{ scheduledTime: 'asc' }, { createdAt: 'desc' }],
      take: 50,
      include: {
        location: { select: { name: true } },
        caseRecord: { select: { name: true, number: true } },
        assignees: { select: { lawyer: { select: { fullName: true } } } },
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    lawyers: lawyers.map((item: any) => ({ id: item.id, name: item.name ?? item.fullName })),
    locations: locations.map((item) => ({ id: item.id, name: item.name })),
    cases: cases.map((item) => ({ id: item.id, name: item.name, number: item.number, clientName: item.clientName })),
    todayTasks: todayTasks.map((item) => ({
      id: item.id,
      description: item.description,
      time: item.scheduledTime,
      location: item.location?.name || null,
      caseName: item.caseRecord?.name || null,
      caseNumber: item.caseRecord?.number || null,
      lawyers: item.assignees.map((x) => x.lawyer.fullName),
    })),
  }, { headers: { 'Cache-Control': 'private, max-age=1800, stale-while-revalidate=3600' } });
}
