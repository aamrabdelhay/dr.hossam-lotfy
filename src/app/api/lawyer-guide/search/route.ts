import { prisma } from '@/lib/prisma';
import { json } from '@/lib/api';
import { buildSearchTerms, normalizeAr } from '@/lib/lawyer-guide-search';

/**
 * Intent-based bilingual search for the Lawyer Guide.
 * Public endpoint — no authentication required.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q')?.trim() ?? '').slice(0, 200);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
  const category = url.searchParams.get('category') || '';
  const governorate = url.searchParams.get('governorate') || '';
  const bucket = url.searchParams.get('bucket') || '';
  const verifiedOnly = url.searchParams.get('verified') === 'true';
  const sort = url.searchParams.get('sort') || 'relevance';

  if (!q && !category) {
    return json({ locations: [], total: 0, intents: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
  }

  const { terms, intents } = buildSearchTerms(q);
  const normalized = q ? normalizeAr(q) : '';

  // Build WHERE clause
  const where: Record<string, unknown> = {
    verificationStatus: verifiedOnly ? 'VERIFIED' : { not: 'ARCHIVED' },
  };

  if (category) where.categoryId = category;
  if (governorate) where.governorate = { contains: governorate, mode: 'insensitive' };
  if (bucket) where.distanceBucket = bucket;

  // Text search with intent-expanded terms
  if (terms.length > 0) {
    const orClauses: Record<string, unknown>[] = [];
    for (const term of terms) {
      const nt = normalizeAr(term);
      orClauses.push(
        { name: { contains: term, mode: 'insensitive' } },
        { nameEn: { contains: term, mode: 'insensitive' } },
        { address: { contains: term, mode: 'insensitive' } },
        { subType: { contains: term, mode: 'insensitive' } },
        { governorate: { contains: term, mode: 'insensitive' } },
        { city: { contains: term, mode: 'insensitive' } },
        { district: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { normalizedName: { contains: nt, mode: 'insensitive' } },
        { searchKeywords: { has: term } },
        { searchKeywords: { has: nt } },
      );
    }

    // Also search services by name
    if (intents.length > 0) {
      const serviceNames = intents.flatMap((i) => i.keywords);
      for (const sn of serviceNames) {
        orClauses.push({
          locationServices: {
            some: {
              service: {
                OR: [
                  { nameAr: { contains: sn, mode: 'insensitive' } },
                  { nameEn: { contains: sn, mode: 'insensitive' } },
                ],
              },
            },
          },
        });
      }
    }

    where.OR = orClauses;
  }

  let orderBy: Record<string, unknown>[];
  if (sort === 'nearest') orderBy = [{ distanceFromDokki: { sort: 'asc', nulls: 'last' } }];
  else if (sort === 'name') orderBy = [{ name: 'asc' }];
  else if (sort === 'verified') orderBy = [{ lastVerified: { sort: 'desc', nulls: 'last' } }];
  else orderBy = [{ distanceFromDokki: { sort: 'asc', nulls: 'last' } }, { name: 'asc' }];

  const [items, total] = await Promise.all([
    prisma.location.findMany({
      where,
      orderBy,
      take: limit,
      skip: (page - 1) * limit,
      include: {
        category: { select: { id: true, nameAr: true, nameEn: true, slug: true } },
        locationServices: {
          take: 5,
          include: { service: { select: { id: true, nameAr: true, nameEn: true, slug: true } } },
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
      lat: l.lat,
      lng: l.lng,
      googleMapsUrl: l.googleMapsUrl,
      officialUrl: l.officialUrl,
      confidenceLevel: l.confidenceLevel,
      verificationStatus: l.verificationStatus,
      confidence: l.confidence,
      lastVerified: l.lastVerified,
      distanceFromDokki: l.distanceFromDokki,
      distanceBucket: l.distanceBucket,
      requiresPersonal: l.requiresPersonal,
      hasOnlineService: l.hasOnlineService,
      workingHours: l.workingHours,
      category: l.category,
      services: l.locationServices.map((ls) => ls.service),
    })),
    intents: intents.map((i) => ({ intent: i.intent, categorySlugs: i.categorySlugs })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
