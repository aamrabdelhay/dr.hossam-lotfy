import { prisma } from '@/lib/prisma';
import { json } from '@/lib/api';
import { DOKKI_ORIGIN } from '@/lib/legal-directory';

/**
 * GET: nearby locations using Haversine distance.
 * Supports: ?lat=&lng=&radius=&limit=&category=
 * Or: ?from=office (default office at Dokki)
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const fromParam = url.searchParams.get('from') || 'office';
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
  const category = url.searchParams.get('category') || '';
  const bucket = url.searchParams.get('bucket') || '';
  const type = url.searchParams.get('type') || '';

  let originLat: number = DOKKI_ORIGIN.lat;
  let originLng: number = DOKKI_ORIGIN.lng;
  let originLabel: string = DOKKI_ORIGIN.label;

  // Override with user location if provided
  const userLat = parseFloat(url.searchParams.get('lat') || '');
  const userLng = parseFloat(url.searchParams.get('lng') || '');
  if (!isNaN(userLat) && !isNaN(userLng) && userLat >= -90 && userLat <= 90 && userLng >= -180 && userLng <= 180) {
    originLat = userLat;
    originLng = userLng;
    originLabel = 'موقعك';
  }

  // Check admin settings for office location
  if (fromParam === 'office') {
    const [latSetting, lngSetting, labelSetting] = await Promise.all([
      prisma.adminSetting.findUnique({ where: { key: 'office_lat' } }),
      prisma.adminSetting.findUnique({ where: { key: 'office_lng' } }),
      prisma.adminSetting.findUnique({ where: { key: 'office_label' } }),
    ]);
    if (latSetting && lngSetting) {
      const lat = parseFloat(latSetting.value);
      const lng = parseFloat(lngSetting.value);
      if (!isNaN(lat) && !isNaN(lng)) {
        originLat = lat;
        originLng = lng;
        originLabel = labelSetting?.value || DOKKI_ORIGIN.label;
      }
    }
  }

  const where: Record<string, unknown> = {
    verificationStatus: { not: 'ARCHIVED' },
    lat: { not: null },
    lng: { not: null },
  };

  if (category) where.categoryId = category;
  if (bucket) where.distanceBucket = bucket;
  if (type) where.type = type;

  // Use distanceFromDokki for sorting when origin is office, or just use pre-computed distances
  const locations = await prisma.location.findMany({
    where,
    orderBy: [{ distanceFromDokki: { sort: 'asc', nulls: 'last' } }, { name: 'asc' }],
    take: limit,
    include: {
      category: { select: { id: true, nameAr: true, nameEn: true, slug: true } },
      locationServices: {
        take: 4,
        include: { service: { select: { id: true, nameAr: true, nameEn: true, slug: true } } },
      },
    },
  });

  // Compute actual distance from provided origin using Haversine
  const withDistance = locations.map((l) => {
    if (l.lat == null || l.lng == null) return { ...l, computedDistance: null };
    const R = 6371;
    const dLat = ((l.lat - originLat) * Math.PI) / 180;
    const dLng = ((l.lng - originLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((originLat * Math.PI) / 180) * Math.cos((l.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return { ...l, computedDistance: distance };
  });

  // Sort by computed distance
  withDistance.sort((a, b) => (a.computedDistance ?? Infinity) - (b.computedDistance ?? Infinity));

  return json({
    origin: { lat: originLat, lng: originLng, label: originLabel },
    locations: withDistance.map((l) => ({
      id: l.id,
      slug: l.slug,
      name: l.name,
      nameEn: l.nameEn,
      type: l.type,
      subType: l.subType,
      governorate: l.governorate,
      city: l.city,
      district: l.district,
      lat: l.lat,
      lng: l.lng,
      distance: l.computedDistance != null ? Math.round(l.computedDistance * 10) / 10 : null,
      distanceBucket: l.distanceBucket,
      confidence: l.confidence,
      confidenceLevel: l.confidenceLevel,
      verificationStatus: l.verificationStatus,
      requiresPersonal: l.requiresPersonal,
      hasOnlineService: l.hasOnlineService,
      category: l.category,
      services: l.locationServices.map((ls) => ls.service),
    })),
  });
}
