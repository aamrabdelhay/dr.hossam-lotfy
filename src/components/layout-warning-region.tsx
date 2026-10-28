import { WarningBar } from '@/components/warning-bar';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isFrameworkError, redact } from '@/lib/health';

export async function LayoutWarningRegion() {
  const session = await getCurrentUser().catch((error) => {
    if (isFrameworkError(error)) throw error;
    console.error('[layout] session warning auth unavailable:', redact(error));
    return null;
  });
  if (!session) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + 15);
  try {
    const count = await prisma.task.count({
      where: {
        scheduledDate: { gte: today, lt: windowEnd },
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
    });
    return <WarningBar active={count > 0} count={count} />;
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    console.error('[layout] session warning count unavailable:', redact(error));
    return null;
  }
}
