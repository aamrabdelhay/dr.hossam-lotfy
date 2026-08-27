import 'server-only';
import { prisma } from './prisma';
import type { NavLawyer, NavLocation } from './constants';

export async function getSiteNav() {
  const [lawyers, locations] = await Promise.all([
    prisma.lawyer.findMany({
      // Only approved lawyers appear in public navigation.
      where: { active: true, approvedAt: { not: null } },
      select: { id: true, slug: true, fullName: true, title: true, profilePhotoUrl: true, isPrincipal: true, sortOrder: true },
      orderBy: [{ sortOrder: 'asc' }, { fullName: 'asc' }],
    }),
    prisma.location.findMany({
      select: { id: true, slug: true, name: true, type: true },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    }),
  ]);
  return {
    lawyers: lawyers.map((l) => ({ id: l.id, slug: l.slug, name: l.fullName, title: l.title, photo: l.profilePhotoUrl, isPrincipal: l.isPrincipal })) as NavLawyer[],
    locations: locations.map((l) => ({ id: l.id, slug: l.slug, name: l.name, type: l.type })) as NavLocation[],
  };
}
