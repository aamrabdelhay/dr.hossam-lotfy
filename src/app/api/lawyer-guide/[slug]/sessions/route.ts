import { prisma } from '@/lib/prisma';
import { handle, json, user } from '@/lib/api';

type Ctx = { params: Promise<{ slug: string }> };

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const session = await user();
  if (!session) return json({ error: 'يجب تسجيل الدخول لعرض سجل جلسات المكتب' }, { status: 401 });

  const { slug } = await ctx.params;
  const location = await prisma.location.findUnique({ where: { slug }, select: { id: true } });
  if (!location) return json({ error: 'المكان غير موجود' }, { status: 404 });

  const tasks = await prisma.task.findMany({
    where: { locationId: location.id },
    orderBy: [{ scheduledDate: 'desc' }, { scheduledTime: 'desc' }],
    take: 100,
    select: {
      id: true,
      description: true,
      scheduledDate: true,
      scheduledTime: true,
      status: true,
      caseRecord: { select: { name: true, number: true } },
      assignees: { select: { lawyer: { select: { fullName: true } } } },
    },
  });

  return json({
    sessions: tasks.map((task) => ({
      id: task.id,
      description: task.description,
      scheduledDate: task.scheduledDate?.toISOString().slice(0, 10) ?? null,
      scheduledTime: task.scheduledTime,
      status: task.status,
      caseLabel: task.caseRecord ? `${task.caseRecord.name}${task.caseRecord.number ? ` — ${task.caseRecord.number}` : ''}` : null,
      lawyers: task.assignees.map((a) => a.lawyer.fullName),
    })),
  });
});
