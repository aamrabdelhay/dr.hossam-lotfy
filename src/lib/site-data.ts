import 'server-only';
import { cache } from 'react';
import { prisma } from './prisma';
import type { NavLawyer, NavLocation } from './constants';
import { getLawyerManagementLabels } from './office-workflow';

export const getSiteNav = cache(async function getSiteNav(branchId?: string) {
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
  const management = await getLawyerManagementLabels(lawyers.map((l) => l.id));
  return {
    lawyers: lawyers.map((l) => ({ id: l.id, slug: l.slug, name: l.fullName, title: l.title, photo: l.profilePhotoUrl, isPrincipal: l.isPrincipal, managementLabels: management[l.id] ?? [] })) as NavLawyer[],
    locations: locations.map((l) => ({ id: l.id, slug: l.slug, name: l.name, type: l.type })) as NavLocation[],
  };
});

export const getSiteBranding = cache(async function getSiteBranding() {
  const rows = await prisma.$queryRawUnsafe<Array<{ logo_data_url: string | null }>>(
    `SELECT "logo_data_url" FROM "office_site_settings" WHERE "id" = 'default' LIMIT 1`,
  );
  return { logoDataUrl: rows[0]?.logo_data_url ?? null };
});
