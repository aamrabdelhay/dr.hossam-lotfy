import 'server-only';
import { prisma } from './prisma';

export async function getRecentLawyerStatusPosts(limit = 10) {
  const rows = await prisma.activityLog.findMany({
    where: { action: { in: ['LAWYER_DEACTIVATED', 'LAWYER_REACTIVATED'] } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { lawyer: { select: { fullName: true, slug: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    action: row.action as 'LAWYER_DEACTIVATED' | 'LAWYER_REACTIVATED',
    summary: row.summary,
    createdAt: row.createdAt.toISOString(),
    lawyer: row.lawyer,
  }));
}
