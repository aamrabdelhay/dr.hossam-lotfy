import 'server-only';
import { prisma } from './prisma';
import type { NavLawyer, NavLocation } from './constants';

export async function getSiteNav(branchId?: string) {
  const [lawyers, locations] = await Promise.all([
    branchId
      ? prisma.$queryRawUnsafe<Array<{id:string;slug:string;fullName:string;title:string;profilePhotoUrl:string|null;isPrincipal:boolean;sortOrder:number}>>(
          'SELECT l."id",l."slug",l."fullName",l."title",l."profilePhotoUrl",l."isPrincipal",l."sortOrder" FROM "lawyers" l JOIN "office_branch_lawyers" bl ON bl."lawyer_id"=l."id" WHERE bl."branch_id"=$1 AND l."active"=true AND l."approvedAt" IS NOT NULL ORDER BY l."sortOrder",l."fullName"',
          branchId,
        )
      : prisma.lawyer.findMany({
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
