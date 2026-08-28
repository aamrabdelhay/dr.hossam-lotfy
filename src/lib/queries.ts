import 'server-only';
import { prisma, Prisma } from './prisma';
import type { Task, Lawyer, Location } from './prisma';
import { daysUntil, urgencyOf, type Urgency } from './dates';

export type TaskVM = {
  id: string;
  description: string;
  notes: string | null;
  scheduledDate: string | null; // ISO date (yyyy-mm-dd)
  scheduledTime: string | null;
  status: Task['status'];
  completedAt: string | null;
  createdAt: string;
  urgency: Urgency;
  daysLeft: number | null;
  location: { id: string; slug: string; name: string; type: Location['type'] };
  caseName: string | null;
  caseNumber: string | null;
  author: { id: string; name: string; title: Lawyer['title']; slug: string; photo: string | null } | null;
  createdBy: { name: string } | null;
  lawyerIds: string[];
  lawyers: Array<{ id: string; name: string; title: Lawyer['title']; slug: string; photo: string | null; phone: string | null; completed: boolean }>;
  commentCount: number;
  lastCommentAt: string | null;
};

export const taskInclude = {
  location: true,
  caseRecord: true,
  author: { select: { id: true, fullName: true, title: true, slug: true, profilePhotoUrl: true } },
  createdBy: { select: { name: true } },
  assignees: {
    select: {
      lawyer: { select: { id: true, fullName: true, title: true, slug: true, profilePhotoUrl: true, phone: true } },
      completedAt: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
  comments: { select: { createdAt: true }, orderBy: { createdAt: 'desc' as const }, take: 1 },
} satisfies Prisma.TaskInclude;

/** Minimal structural shape accepted by toTaskVM (works with any include/select subset). */
type TaskShape = {
  id: string;
  description: string;
  notes: string | null;
  scheduledDate: Date | null;
  scheduledTime: string | null;
  status: Task['status'];
  completedAt: Date | null;
  createdAt: Date;
  location: { id: string; slug: string; name: string; type: Location['type'] };
  caseRecord: { name: string; number: string } | null;
  author: { id: string; fullName: string; title: Lawyer['title']; slug: string; profilePhotoUrl: string | null } | null;
  createdBy: { name: string } | null | undefined;
  assignees: Array<{ lawyer: { id: string; fullName: string; title: Lawyer['title']; slug: string; profilePhotoUrl: string | null; phone: string | null }; completedAt: Date | null }>;
  comments: Array<{ createdAt: Date }>;
};

export function toTaskVM(t: TaskShape): TaskVM {
  const date = t.scheduledDate ? new Date(t.scheduledDate) : null;
  return {
    id: t.id,
    description: t.description,
    notes: t.notes,
    scheduledDate: date ? date.toISOString().slice(0, 10) : null,
    scheduledTime: t.scheduledTime,
    status: t.status,
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
    urgency: urgencyOf(date),
    daysLeft: date ? daysUntil(date) : null,
    location: { id: t.location.id, slug: t.location.slug, name: t.location.name, type: t.location.type },
    caseName: t.caseRecord?.name ?? null,
    caseNumber: t.caseRecord?.number ?? null,
    author: t.author
      ? { id: t.author.id, name: t.author.fullName, title: t.author.title, slug: t.author.slug, photo: t.author.profilePhotoUrl }
      : null,
    createdBy: t.createdBy ? { name: t.createdBy.name } : null,
    lawyerIds: t.assignees.map((a) => a.lawyer.id),
    lawyers: t.assignees.map((a) => ({
      id: a.lawyer.id,
      name: a.lawyer.fullName,
      title: a.lawyer.title,
      slug: a.lawyer.slug,
      photo: a.lawyer.profilePhotoUrl,
      phone: a.lawyer.phone,
      completed: !!a.completedAt,
    })),
    commentCount: t.comments.length,
    lastCommentAt: t.comments[0]?.createdAt.toISOString() ?? null,
  };
}

export type SidebarData = {
  warning: boolean;
  warningCount: number;
  sections: {
    tomorrow: TaskVM[];
    within3: TaskVM[];
    within14: TaskVM[];
    within30: TaskVM[];
    all: TaskVM[];
  };
};

function byDateAsc(a: TaskVM, b: TaskVM): number {
  const ka = a.scheduledDate ? `${a.scheduledDate}T${a.scheduledTime ?? '23:59'}` : '9999';
  const kb = b.scheduledDate ? `${b.scheduledDate}T${b.scheduledTime ?? '23:59'}` : '9999';
  if (ka !== kb) return ka < kb ? -1 : 1;
  return b.createdAt.localeCompare(a.createdAt);
}

/** Upcoming sessions grouped into the five sidebar sections. */
export async function getSidebarData(): Promise<SidebarData> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rows = await prisma.task.findMany({
    where: {
      OR: [
        { scheduledDate: { gte: today } },
        // dateless tasks also appear in "all"
        { scheduledDate: null, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      ],
      status: { notIn: ['CANCELLED'] },
    },
    include: taskInclude,
  });
  const vms = rows.map((t) => toTaskVM(t as never)).sort(byDateAsc);

  const open = (vm: TaskVM) => vm.status !== 'COMPLETED';
  const tomorrow = vms.filter((v) => v.daysLeft === 1 && open(v));
  const within3 = vms.filter((v) => v.daysLeft !== null && v.daysLeft >= 2 && v.daysLeft <= 3 && open(v));
  const within14 = vms.filter((v) => v.daysLeft !== null && v.daysLeft >= 4 && v.daysLeft <= 14 && open(v));
  const within30 = vms.filter((v) => v.daysLeft !== null && v.daysLeft >= 15 && v.daysLeft <= 30 && open(v));
  const all = vms.filter((v) => open(v));

  const warnCount = vms.filter((v) => v.daysLeft !== null && v.daysLeft >= 0 && v.daysLeft <= 14 && open(v)).length;
  return {
    warning: warnCount > 0,
    warningCount: warnCount,
    sections: { tomorrow, within3, within14, within30, all },
  };
}

/** Chronological main feed (newest first), with optional filtering. */
export async function getFeed(params: {
  lawyerId?: string;
  locationId?: string;
  status?: string;
  from?: string;
  to?: string;
  /** Free-text search across client name, case name/number and the description. */
  q?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ items: TaskVM[]; total: number }> {
  const { lawyerId, locationId, status, from, to, q, limit = 30, offset = 0 } = params;
  const term = q?.trim();
  const where: Prisma.TaskWhereInput = {
    ...(locationId ? { locationId } : {}),
    ...(lawyerId ? { assignees: { some: { lawyerId } } } : {}),
    ...(status ? { status: status as Task['status'] } : {}),
    ...(term
      ? {
          OR: [
            // العميل — the primary way the office looks a session up.
            { caseRecord: { clientName: { contains: term, mode: 'insensitive' } } },
            { caseRecord: { name: { contains: term, mode: 'insensitive' } } },
            { caseRecord: { number: { contains: term, mode: 'insensitive' } } },
            { description: { contains: term, mode: 'insensitive' } },
            { notes: { contains: term, mode: 'insensitive' } },
            { location: { name: { contains: term, mode: 'insensitive' } } },
            { assignees: { some: { lawyer: { fullName: { contains: term, mode: 'insensitive' } } } } },
          ],
        }
      : {}),
    ...(from || to
      ? {
          scheduledDate: {
            ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
          },
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.task.count({ where }),
  ]);
  return { items: items.map(toTaskVM), total };
}

/** Tasks for a lawyer profile: authored posts + assigned tasks, deduped. */
export async function getLawyerFeed(lawyerId: string, opts: { limit?: number } = {}) {
  const limit = opts.limit ?? 50;
  const tasks = await prisma.task.findMany({
    where: {
      OR: [{ authorId: lawyerId }, { assignees: { some: { lawyerId } } }],
      status: { not: 'CANCELLED' },
    },
    include: taskInclude,
    orderBy: [{ scheduledDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
    take: limit,
  });
  return tasks.map(toTaskVM);
}

export interface TaskVMFull extends TaskVM {
  raw: {
    createdAt: Date;
    createdBy: { name: string } | null;
    comments: Array<{
      id: string;
      text: string;
      createdAt: Date;
      authorName: string | null;
      authorLawyerId: string | null;
      authorUserId: string | null;
      authorLawyer: { fullName: string; profilePhotoUrl: string | null } | null;
      authorUser: { name: string } | null;
    }>;
  };
}

export async function getTaskVM(id: string): Promise<TaskVM | null>;
export async function getTaskVM(id: string, withRaw: true): Promise<TaskVMFull | null>;
export async function getTaskVM(id: string, withRaw = false): Promise<TaskVM | TaskVMFull | null> {
  const t = await prisma.task.findUnique({
    where: { id },
    include: {
      ...taskInclude,
      comments: {
        include: {
          authorLawyer: { select: { id: true, fullName: true, title: true, slug: true, profilePhotoUrl: true } },
          authorUser: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      activity: { orderBy: { createdAt: 'desc' }, take: 30 },
      createdBy: { select: { name: true } },
    },
  });
  if (!t) return null;
  const vm = toTaskVM(t as never);
  if (!withRaw) return vm;
  return {
    ...vm,
    raw: {
      createdAt: t.createdAt,
      createdBy: t.createdBy,
      comments: t.comments.map((c) => ({
        id: c.id,
        text: c.text,
        createdAt: c.createdAt,
        authorName: c.authorName,
        authorLawyerId: c.authorLawyerId,
        authorUserId: c.authorUserId,
        authorLawyer: c.authorLawyer,
        authorUser: c.authorUser,
      })),
    },
  } satisfies TaskVMFull;
}

export type AdminStats = {
  today: number;
  tomorrow: number;
  critical: number;
  important: number;
  upcoming30: number;
  uncompleted: number;
  completed: number;
  lawyers: number;
  locations: number;
  cases: number;
};

export async function getAdminStats(): Promise<AdminStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dPlus = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d;
  };
  const notCancelled: Prisma.TaskWhereInput = { status: { not: 'CANCELLED' } };

  const [todayN, tomorrowN, critN, impN, upN, unN, doneN, lawyers, locations, cases] = await Promise.all([
    prisma.task.count({ where: { ...notCancelled, scheduledDate: { gte: today, lt: dPlus(1) } } }),
    prisma.task.count({ where: { ...notCancelled, scheduledDate: { gte: dPlus(1), lt: dPlus(2) } } }),
    prisma.task.count({ where: { ...notCancelled, status: { not: 'COMPLETED' }, scheduledDate: { gte: dPlus(1), lte: dPlus(3) } } }),
    prisma.task.count({ where: { ...notCancelled, status: { not: 'COMPLETED' }, scheduledDate: { gte: dPlus(4), lte: dPlus(14) } } }),
    prisma.task.count({ where: { ...notCancelled, status: { not: 'COMPLETED' }, scheduledDate: { gte: dPlus(15), lte: dPlus(30) } } }),
    prisma.task.count({ where: { status: { in: ['PENDING', 'IN_PROGRESS'] } } }),
    prisma.task.count({ where: { status: 'COMPLETED' } }),
    prisma.lawyer.count({ where: { active: true } }),
    prisma.location.count(),
    prisma.caseRecord.count(),
  ]);
  return {
    today: todayN,
    tomorrow: tomorrowN,
    critical: critN,
    important: impN,
    upcoming30: upN,
    uncompleted: unN,
    completed: doneN,
    lawyers,
    locations,
    cases,
  };
}

// ─────────────────────────── Case archive ───────────────────────────

export type ArchivedCase = {
  id: string;
  name: string;
  number: string;
  clientName: string | null;
  /** The most recent session whose date has already passed. */
  lastSession: { id: string; date: string; time: string | null; locationName: string; description: string; status: Task['status'] } | null;
  /** The next scheduled session, if the case was re-listed (تأجيل/استئناف/نقض). */
  nextSession: { id: string; date: string; time: string | null; locationName: string } | null;
  /** Past sessions still not marked as executed — these need the office's attention. */
  pendingCount: number;
  totalSessions: number;
  lawyers: string[];
  events: Array<{ id: string; description: string; type: string; authorName: string | null; createdAt: string }>;
};

/**
 * أرشيف القضايا — every case that has at least one session whose date has
 * already passed. The office uses this to chase what happened next: an appeal
 * (استئناف), a cassation (نقض) or simply an adjournment (تأجيل) to a new date.
 *
 * `needsFollowUp` (no future date on the books) is surfaced first because those
 * are the cases at risk of being forgotten.
 */
export async function getCaseArchive(params: { q?: string; limit?: number } = {}): Promise<ArchivedCase[]> {
  const term = params.q?.trim();
  const limit = params.limit ?? 300;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cases = await prisma.caseRecord.findMany({
    where: {
      // Only cases that actually have a past-dated session.
      tasks: { some: { scheduledDate: { lt: today }, status: { not: 'CANCELLED' } } },
      ...(term
        ? {
            OR: [
              { clientName: { contains: term, mode: 'insensitive' } },
              { name: { contains: term, mode: 'insensitive' } },
              { number: { contains: term, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
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
    take: limit,
  });

  const iso = (d: Date) => new Date(d).toISOString().slice(0, 10);

  const rows: ArchivedCase[] = cases.map((c) => {
    const dated = c.tasks.filter((t) => t.scheduledDate);
    const past = dated.filter((t) => new Date(t.scheduledDate as Date) < today);
    const future = dated.filter((t) => new Date(t.scheduledDate as Date) >= today);
    const last = past[past.length - 1] ?? null;
    const next = future[0] ?? null;
    const lawyers = Array.from(
      new Set(c.tasks.flatMap((t) => t.assignees.map((a) => a.lawyer.fullName))),
    );
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
            status: last.status,
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

  // Cases with no future date come first (they need a decision), then by the
  // most recent past session.
  return rows.sort((a, b) => {
    const followUpA = a.nextSession ? 1 : 0;
    const followUpB = b.nextSession ? 1 : 0;
    if (followUpA !== followUpB) return followUpA - followUpB;
    return (b.lastSession?.date ?? '').localeCompare(a.lastSession?.date ?? '');
  });
}
