import { prisma } from '@/lib/prisma';
import { json, user, requirePermission, readJson, handle } from '@/lib/api';
import { z } from 'zod';
import { normalizeAr } from '@/lib/lawyer-guide-search';
import { slugify, uniqueSlug } from '@/lib/slug';

/** GET: list all locations with filters, pagination, and search. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '24')));
  const q = url.searchParams.get('q')?.trim() || '';
  const category = url.searchParams.get('category') || '';
  const governorate = url.searchParams.get('governorate') || '';
  const city = url.searchParams.get('city') || '';
  const district = url.searchParams.get('district') || '';
  const type = url.searchParams.get('type') || '';
  const bucket = url.searchParams.get('bucket') || '';
  const sort = url.searchParams.get('sort') || 'relevance';
  const verifiedOnly = url.searchParams.get('verified') === 'true';
  const serviceId = url.searchParams.get('service') || '';
  const confidenceLevel = url.searchParams.get('confidence') || '';
  const openNow = url.searchParams.get('openNow') === 'true';
  const physicalVisit = url.searchParams.get('physicalVisit');
  const onlineService = url.searchParams.get('onlineService');
  const hideArchived = url.searchParams.get('hideArchived') !== 'false'; // default true

  const where: Record<string, unknown> = {};

  // Hide archived by default
  if (hideArchived) {
    where.verificationStatus = { not: 'ARCHIVED' };
  }

  if (verifiedOnly) {
    where.verificationStatus = 'VERIFIED';
  }

  if (confidenceLevel) {
    where.confidenceLevel = confidenceLevel;
  }

  if (category) {
    where.categoryId = category;
  }

  if (governorate) {
    where.governorate = { contains: governorate, mode: 'insensitive' };
  }

  if (city) {
    where.city = { contains: city, mode: 'insensitive' };
  }

  if (district) {
    where.district = { contains: district, mode: 'insensitive' };
  }

  if (type) {
    where.type = type;
  }

  if (bucket) {
    where.distanceBucket = bucket;
  }

  if (physicalVisit === 'true') where.requiresPersonal = true;
  if (physicalVisit === 'false') where.requiresPersonal = false;
  if (onlineService === 'true') where.hasOnlineService = true;
  if (onlineService === 'false') where.hasOnlineService = false;

  // Text search — search across name, nameEn, address, description, keywords
  if (q) {
    const normalized = normalizeAr(q);
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { nameEn: { contains: q, mode: 'insensitive' } },
      { address: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { normalizedName: { contains: normalized, mode: 'insensitive' } },
      { searchKeywords: { has: q } },
      { searchKeywords: { has: normalized } },
    ];
  }

  // Service filter
  if (serviceId) {
    where.locationServices = { some: { serviceId } };
  }

  // Sorting
  let orderBy: Record<string, unknown>[] | Record<string, unknown> = [
    { type: 'asc' },
    { distanceFromDokki: { sort: 'asc', nulls: 'last' } },
    { name: 'asc' },
  ];

  if (sort === 'name') orderBy = [{ name: 'asc' }];
  if (sort === 'nearest') orderBy = [{ distanceFromDokki: { sort: 'asc', nulls: 'last' } }];
  if (sort === 'farthest') orderBy = [{ distanceFromDokki: { sort: 'desc', nulls: 'last' } }];
  if (sort === 'verified') orderBy = [{ lastVerified: { sort: 'desc', nulls: 'last' } }];
  if (sort === 'confidence') orderBy = [{ confidenceLevel: 'asc' }];

  const [items, total] = await Promise.all([
    prisma.location.findMany({
      where,
      orderBy,
      take: limit,
      skip: (page - 1) * limit,
      include: {
        category: { select: { id: true, nameAr: true, nameEn: true, slug: true } },
        organization: { select: { id: true, nameAr: true, nameEn: true } },
        locationServices: {
          take: 6,
          include: { service: { select: { id: true, nameAr: true, nameEn: true, slug: true, onlineAvailable: true } } },
        },
        locationJurisdictions: {
          take: 3,
          include: { jurisdiction: { select: { id: true, nameAr: true, nameEn: true, type: true } } },
        },
        relationshipsFrom: {
          where: { verified: true },
          take: 10,
          include: {
            toLocation: { select: { id: true, slug: true, name: true, type: true } },
          },
        },
      },
    }),
    prisma.location.count({ where }),
  ]);

  return json({
    locations: items.map((l) => ({
      id: l.id,
      slug: l.slug,
      name: l.name,
      nameEn: l.nameEn,
      type: l.type,
      subType: l.subType,
      governorate: l.governorate,
      city: l.city,
      district: l.district,
      address: l.address,
      phone: l.phone,
      email: l.email,
      officialUrl: l.officialUrl,
      googleMapsUrl: l.googleMapsUrl,
      lat: l.lat,
      lng: l.lng,
      workingHours: l.workingHours,
      services: l.services,
      jurisdiction: l.jurisdiction,
      requiresPersonal: l.requiresPersonal,
      hasOnlineService: l.hasOnlineService,
      source: l.source,
      lastVerified: l.lastVerified,
      confidence: l.confidence,
      confidenceLevel: l.confidenceLevel,
      verificationStatus: l.verificationStatus,
      distanceFromDokki: l.distanceFromDokki,
      distanceBucket: l.distanceBucket,
      searchKeywords: l.searchKeywords,
      description: l.description,
      category: l.category,
      organization: l.organization,
      locationServices: l.locationServices.map((ls) => ls.service),
      locationJurisdictions: l.locationJurisdictions.map((lj) => lj.jurisdiction),
      relationships: l.relationshipsFrom.map((r) => ({
        toLocation: r.toLocation,
        type: r.type,
      })),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

const createSchema = z.object({
  name: z.string().min(2).max(200),
  nameEn: z.string().max(200).optional().nullable(),
  type: z.string().max(60),
  subType: z.string().max(100).optional().nullable(),
  governorate: z.string().max(80).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  district: z.string().max(80).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  website: z.string().max(200).optional().nullable(),
  googleMapsUrl: z.string().max(500).optional().nullable(),
  officialUrl: z.string().max(500).optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  workingHours: z.string().max(200).optional().nullable(),
  services: z.array(z.string().max(120)).max(30).optional(),
  jurisdiction: z.string().max(300).optional().nullable(),
  requiresPersonal: z.boolean().optional(),
  hasOnlineService: z.boolean().optional(),
  source: z.string().max(200).optional().nullable(),
  confidence: z.string().max(40).optional().nullable(),
  categoryId: z.string().optional().nullable(),
  organizationId: z.string().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  searchKeywords: z.array(z.string().max(60)).max(40).optional(),
});

/** POST: create a new location. Requires manageLocations permission. */
export const POST = handle(async (req: Request) => {
  const session = await requirePermission('manageLocations');
  const data = await readJson(req as never, createSchema);

  const name = data.name.trim();
  const exists = await prisma.location.findFirst({
    where: { OR: [{ name }, { slug: slugify(name) }] },
  });
  if (exists) return json({ error: 'يوجد مكان بهذا الاسم بالفعل' }, { status: 409 });

  const slug = await uniqueSlug(slugify(name));
  const normalizedName = normalizeAr(name);

  const location = await prisma.location.create({
    data: {
      name,
      slug,
      type: data.type as never,
      nameEn: data.nameEn?.trim() || null,
      subType: data.subType?.trim() || null,
      governorate: data.governorate?.trim() || null,
      city: data.city?.trim() || null,
      district: data.district?.trim() || null,
      address: data.address?.trim() || null,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      website: data.website?.trim() || null,
      officialUrl: data.officialUrl?.trim() || null,
      googleMapsUrl: data.googleMapsUrl?.trim() || null,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      workingHours: data.workingHours?.trim() || null,
      services: data.services ?? [],
      jurisdiction: data.jurisdiction?.trim() || null,
      requiresPersonal: data.requiresPersonal ?? false,
      hasOnlineService: data.hasOnlineService ?? false,
      source: data.source?.trim() || null,
      confidence: data.confidence?.trim() || null,
      categoryId: data.categoryId || null,
      organizationId: data.organizationId || null,
      description: data.description?.trim() || null,
      searchKeywords: data.searchKeywords ?? [],
      normalizedName,
      verificationStatus: 'DRAFT',
      confidenceLevel: 'NEEDS_VERIFICATION',
    },
  });

  return json({ ok: true, location: { id: location.id, slug: location.slug } }, { status: 201 });
});
