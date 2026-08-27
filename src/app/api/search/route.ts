import { prisma } from '@/lib/prisma';
import { toTaskVM } from '@/lib/queries';
import { json, user } from '@/lib/api';
import { expandTerms } from '@/lib/search-synonyms';

/**
 * Smart bilingual search. Operational search is available only to authenticated
 * staff/lawyers because results can contain case and scheduling information.
 */
export async function GET(req: Request) {
  const session = await user();
  if (!session) return json({ error: 'يجب تسجيل الدخول لاستخدام البحث' }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get('q')?.trim() ?? '').slice(0, 120);
  const type = (url.searchParams.get('type') ?? 'all') as string;

  if (!q) return json({ locations: [], lawyers: [], sessions: [] });

  const terms = expandTerms(q);

  const orAcross = (fields: string[]) =>
    terms.flatMap((t) => fields.map((f) => ({ [f]: { contains: t, mode: 'insensitive' as const } })));

  const keywordVariants = (t: string) => [...new Set([t, t.toLowerCase()])];
  const keywordOr = terms.flatMap((t) => keywordVariants(t).map((v) => ({ searchKeywords: { has: v } })));

  const locationFilter = [...orAcross(['name', 'nameEn', 'address', 'subType', 'governorate']), ...keywordOr];

  const locationWhere =
    type === 'court'
      ? { type: 'COURT' as const, OR: locationFilter }
      : type === 'location'
        ? { type: { not: 'COURT' as const }, OR: locationFilter }
        : type === 'lawyer' || type === 'session'
          ? undefined
          : { OR: locationFilter };

  const [locations, lawyers, sessions] = await Promise.all([
    locationWhere
      ? prisma.location.findMany({
          where: locationWhere,
          take: 20,
          orderBy: [{ type: 'asc' }, { name: 'asc' }],
          include: {
            tasks: {
              where: { scheduledDate: { gte: new Date() }, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
            },
          },
        })
      : Promise.resolve([] as Array<{ id: string; slug: string; name: string; type: string; tasks: unknown[] }>),
    type === 'location' || type === 'session'
      ? Promise.resolve([] as Array<{ id: string; slug: string; fullName: string; title: 'DOCTOR' | 'ADVOCATE'; profilePhotoUrl: string | null; isPrincipal: boolean; assignments: unknown[] }>)
      : prisma.lawyer.findMany({
          where: { active: true, approvedAt: { not: null }, OR: orAcross(['fullName', 'specialization', 'position']) },
          take: 20,
          orderBy: [{ isPrincipal: 'desc' }, { sortOrder: 'asc' }],
          include: {
            assignments: {
              where: {
                task: { status: { notIn: ['COMPLETED', 'CANCELLED'] }, OR: [{ scheduledDate: { gte: new Date() } }, { scheduledDate: null }] },
              },
            },
          },
        }),
    type === 'lawyer' || type === 'location'
      ? Promise.resolve([] as never[])
      : prisma.task.findMany({
          where: {
            OR: [
              ...orAcross(['description', 'notes']),
              { caseRecord: { OR: orAcross(['name', 'number']) } },
              { location: { OR: orAcross(['name', 'nameEn']) } },
            ],
          },
          include: {
            location: true,
            caseRecord: true,
            author: { select: { id: true, fullName: true, title: true, slug: true, profilePhotoUrl: true } },
            assignees: { select: { lawyer: { select: { id: true, fullName: true, title: true, slug: true, profilePhotoUrl: true } }, completedAt: true } },
            comments: { select: { createdAt: true }, take: 1, orderBy: { createdAt: 'desc' } },
          },
          orderBy: [{ scheduledDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
          take: 20,
        }),
  ]);

  return json({
    locations: locations.map((l) => ({
      id: l.id, slug: l.slug, name: l.name, type: l.type, upcoming: (l.tasks as unknown[]).length,
    })),
    lawyers: lawyers.map((l) => ({
      id: l.id,
      slug: l.slug,
      name: l.fullName,
      title: l.title,
      photo: l.profilePhotoUrl,
      isPrincipal: l.isPrincipal,
      upcoming: (l.assignments as unknown[]).length,
    })),
    sessions: sessions.map((t) => toTaskVM(t as never)),
  });
}
