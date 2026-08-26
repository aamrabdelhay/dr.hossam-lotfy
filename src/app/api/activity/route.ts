import { prisma } from '@/lib/prisma';
import { handle, json, requireAdmin } from '@/lib/api';

export const GET = handle(async (_req: Request) => {
  await requireAdmin();
  const limit = 100;
  const activity = await prisma.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      lawyer: { select: { fullName: true, slug: true } },
      byUser: { select: { name: true } },
    },
  });
  return json({ activity });
});
