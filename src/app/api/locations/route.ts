import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handle, json, readJson, requirePermission } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { slugify, uniqueSlug } from '@/lib/slug';

/** All location types — kept in sync with the prisma enum (incl. legacy values). */
const LOCATION_TYPES = [
  'COURT', 'TAX_OFFICE', 'COMMERCIAL_REGISTRY', 'CIVIL_REGISTRY', 'PROSECUTION',
  'LAWYERS_SYNDICATE', 'SURVEY_AUTHORITY', 'PASSPORTS', 'TRAFFIC', 'SOCIAL_INSURANCE',
  'LABOR_OFFICE', 'CUSTOMS', 'INVESTMENT_AGENCY', 'EXPERTS_OFFICE',
  'REAL_ESTATE_REGISTRATION', 'GOVERNMENT_AGENCY', 'OTHER',
] as const;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const governorate = url.searchParams.get('governorate');
  const q = url.searchParams.get('q')?.trim();

  const where: Record<string, unknown> = {};
  if (type && (LOCATION_TYPES as readonly string[]).includes(type)) where.type = type;
  if (governorate) where.governorate = governorate;
  if (q) where.OR = [{ name: { contains: q, mode: 'insensitive' } }, { nameEn: { contains: q, mode: 'insensitive' } }];

  const locations = await prisma.location.findMany({
    where,
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
    include: {
      tasks: {
        where: { scheduledDate: { gte: new Date() }, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        select: { scheduledDate: true },
      },
    },
  });
  return json({
    locations: locations.map((l) => ({
      id: l.id,
      slug: l.slug,
      name: l.name,
      nameEn: l.nameEn,
      type: l.type,
      subType: l.subType,
      governorate: l.governorate,
      city: l.city,
      district: l.district,
      workingHours: l.workingHours,
      distanceBucket: l.distanceBucket,
      distanceFromDokki: l.distanceFromDokki,
      upcoming: l.tasks.length,
      nextTaskDate: l.tasks.length > 0
        ? l.tasks.map((t) => t.scheduledDate).filter(Boolean).sort()[0]?.toISOString().slice(0, 10) ?? null
        : null,
    })),
  });
}

const optionalText = (max: number) => z.string().max(max).optional().nullable();

const createSchema = z.object({
  name: z.string().min(2, 'اسم المكان مطلوب').max(150),
  nameEn: optionalText(150),
  type: z.enum(LOCATION_TYPES, { message: 'اختر نوع المكان' }),
  subType: optionalText(100),
  governorate: optionalText(80),
  city: optionalText(80),
  district: optionalText(80),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  workingHours: optionalText(200),
  services: z.array(z.string().max(120)).max(30).optional(),
  jurisdiction: optionalText(300),
  requiresPersonal: z.boolean().optional(),
  hasOnlineService: z.boolean().optional(),
  source: optionalText(200),
  confidence: optionalText(40),
  distanceFromDokki: z.number().min(0).max(5000).optional().nullable(),
  distanceBucket: optionalText(20),
  buildingId: optionalText(100),
  description: optionalText(1000),
  searchKeywords: z.array(z.string().max(60)).max(40).optional(),
});

/** Staff with manageLocations permission. A page is created automatically at /locations/<slug>. */
export const POST = handle(async (req: Request) => {
  const session = await requirePermission('manageLocations');
  const data = await readJson(req as never, createSchema);

  const name = data.name.trim();
  const exists = await prisma.location.findFirst({
    where: { OR: [{ name }, { slug: slugify(name) }] },
  });
  if (exists) return json({ error: 'يوجد مكان بهذا الاسم بالفعل' }, { status: 409 });

  const slug = await uniqueSlug(slugify(name));
  const location = await prisma.location.create({
    data: {
      name,
      slug,
      type: data.type,
      nameEn: data.nameEn?.trim() || null,
      subType: data.subType?.trim() || null,
      governorate: data.governorate?.trim() || null,
      city: data.city?.trim() || null,
      district: data.district?.trim() || null,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      workingHours: data.workingHours?.trim() || null,
      services: data.services ?? [],
      jurisdiction: data.jurisdiction?.trim() || null,
      requiresPersonal: data.requiresPersonal ?? false,
      hasOnlineService: data.hasOnlineService ?? false,
      source: data.source?.trim() || null,
      confidence: data.confidence?.trim() || null,
      distanceFromDokki: data.distanceFromDokki ?? null,
      distanceBucket: data.distanceBucket?.trim() || null,
      buildingId: data.buildingId?.trim() || null,
      description: data.description?.trim() || null,
      searchKeywords: data.searchKeywords ?? [],
    },
  });

  await logActivity({
    action: 'LOCATION_ADDED',
    summary: `أضاف مكاناً جديداً: ${name}`,
    locationId: location.id,
    byUserId: session.userId,
  });

  return json({ ok: true, location: { id: location.id, slug: location.slug } }, { status: 201 });
});
