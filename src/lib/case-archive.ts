import 'server-only';
import { prisma } from './prisma';
import type { ArchivedCase } from './queries';
import type { Task } from './prisma';

/**
 * Office case register used by /cases/archive.
 * Unlike the follow-up view, this intentionally includes old cases even when
 * they have no session records, so the archive can serve as the office's
 * historical register.
 */
export async function getOfficeCaseArchive(params: { q?: string; limit?: number } = {}): Promise<ArchivedCase[]> {
  const term = params.q?.trim();
  const limit = params.limit ?? 500;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cases = await prisma.caseRecord.findMany({
    where: term
      ? {
          OR: [
            { clientName: { contains: term, mode: 'insensitive' } },
            { name: { contains: term, mode: 'insensitive' } },
            { number: { contains: term, mode: 'insensitive' } },
          ],
        }
      : undefined,
    include: {
      events: { orderBy: { createdAt: 'desc' }, take: 20 },
      tasks: {
        where: { status: { not: 'CANCELLED' } },
        orderBy: { scheduledDate: 'asc' },
        include: {
          location: { select: { name: true } },
          assignees: { select: { lawyer: { select: { fullName: true } } } },
        },
      },
    },
    orderBy: { id: 'desc' },
    take: limit,
  });

  const iso = (d: Date) => new Date(d).toISOString().slice(0, 10);

  const rows: ArchivedCase[] = cases.map((c) => {
    const dated = c.tasks.filter((t) => t.scheduledDate);
    const past = dated.filter((t) => new Date(t.scheduledDate as Date) < today);
    const future = dated.filter((t) => new Date(t.scheduledDate as Date) >= today);
    const last = past[past.length - 1] ?? null;
    const next = future[0] ?? null;
    const lawyers = Array.from(new Set(c.tasks.flatMap((t) => t.assignees.map((a) => a.lawyer.fullName))));

    return {
      id: c.id,
      name: c.name,
      number: c.number,
      clientName: c.clientName,
      lastSession: last
        ? {
            id: last.id,
            date: iso(last.scheduledDate as Date),
            time: last.scheduledTime,
            locationName: last.location.name,
            description: last.description,
            status: last.status as Task['status'],
          }
        : null,
      nextSession: next
        ? { id: next.id, date: iso(next.scheduledDate as Date), time: next.scheduledTime, locationName: next.location.name }
        : null,
      pendingCount: past.filter((t) => t.status !== 'COMPLETED').length,
      totalSessions: c.tasks.length,
      lawyers,
      events: c.events.map((e) => ({
        id: e.id,
        description: e.description,
        type: e.type,
        authorName: e.authorName,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  });

  return rows.sort((a, b) => {
    const aDate = a.lastSession?.date ?? '';
    const bDate = b.lastSession?.date ?? '';
    if (aDate !== bDate) return bDate.localeCompare(aDate);
    return b.name.localeCompare(a.name, 'ar');
  });
}
