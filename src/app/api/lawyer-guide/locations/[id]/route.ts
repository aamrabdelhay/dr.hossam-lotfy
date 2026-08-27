import { prisma } from '@/lib/prisma';
import { json, requirePermission, handle, readJson } from '@/lib/api';
import { z } from 'zod';
import { normalizeAr } from '@/lib/lawyer-guide-search';

/** GET: single location by id or slug. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const location = await prisma.location.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: {
      category: { select: { id: true, nameAr: true, nameEn: true, slug: true } },
      organization: { select: { id: true, nameAr: true, nameEn: true } },
      locationServices: {
        include: { service: { select: { id: true, nameAr: true, nameEn: true, slug: true, onlineAvailable: true } } },
      },
      locationJurisdictions: {
        include: { jurisdiction: true },
      },
      relationshipsFrom: {
        where: { verified: true },
        include: {
          toLocation: { select: { id: true, slug: true, name: true, type: true, governorate: true, district: true } },
        },
      },
      relationshipsTo: {
        where: { verified: true },
        include: {
          fromLocation: { select: { id: true, slug: true, name: true, type: true, governorate: true, district: true } },
        },
      },
      locationSources: {
        include: { source: { select: { id: true, name: true, url: true, type: true } } },
      },
      verificationRecords: {
        orderBy: { verifiedAt: 'desc' },
        take: 5,
      },
      openingHours: {
        orderBy: { dayOfWeek: 'asc' },
      },
      changeHistory: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });

  if (!location) return json({ error: 'المكان غير موجود' }, { status: 404 });

  return json({ location });
}

const updateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  nameEn: z.string().max(200).optional().nullable(),
  type: z.string().max(60).optional(),
  subType: z.string().max(100).optional().nullable(),
  governorate: z.string().max(80).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  district: z.string().max(80).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  website: z.string().max(200).optional().nullable(),
  officialUrl: z.string().max(500).optional().nullable(),
  googleMapsUrl: z.string().max(500).optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  workingHours: z.string().max(200).optional().nullable(),
  services: z.array(z.string().max(120)).max(30).optional(),
  jurisdiction: z.string().max(300).optional().nullable(),
  requiresPersonal: z.boolean().optional(),
  hasOnlineService: z.boolean().optional(),
  source: z.string().max(200).optional().nullable(),
  confidence: z.string().max(40).optional().nullable(),
  confidenceLevel: z.string().optional(),
  verificationStatus: z.string().optional(),
  categoryId: z.string().optional().nullable(),
  organizationId: z.string().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  searchKeywords: z.array(z.string().max(60)).max(40).optional(),
});

/** PATCH: update a location. Requires manageLocations permission. */
export const PATCH = handle(async (req: Request) => {
  const session = await requirePermission('manageLocations');
  const url = new URL(req.url);
  const id = url.pathname.split('/').pop()!;
  const data = await readJson(req as never, updateSchema);

  const existing = await prisma.location.findFirst({ where: { OR: [{ id }, { slug: id }] } });
  if (!existing) return json({ error: 'المكان غير موجود' }, { status: 404 });

  // Track changes
  const changes: Array<{ field: string; previousValue: string | null; newValue: string | null }> = [];
  for (const [field, value] of Object.entries(data)) {
    if (value === undefined) continue;
    const old = (existing as Record<string, unknown>)[field];
    if (JSON.stringify(old) !== JSON.stringify(value)) {
      changes.push({ field, previousValue: old != null ? String(old) : null, newValue: value != null ? String(value) : null });
    }
  }

  const updateData: Record<string, unknown> = { ...data };
  if (data.name) {
    updateData.normalizedName = normalizeAr(data.name);
  }

  await prisma.location.update({
    where: { id: existing.id },
    data: updateData,
  });

  // Record changes
  if (changes.length > 0) {
    await prisma.dataChangeHistory.createMany({
      data: changes.map((c) => ({
        locationId: existing.id,
        field: c.field,
        previousValue: c.previousValue,
        newValue: c.newValue,
        changedById: session.userId,
        reason: 'تحديث من لوحة الإدارة',
      })),
    });
  }

  return json({ ok: true });
});

/** DELETE: soft-archive a location. Requires manageLocations permission. */
export const DELETE = handle(async (req: Request) => {
  const session = await requirePermission('manageLocations');
  const url = new URL(req.url);
  const id = url.pathname.split('/').pop()!;

  const location = await prisma.location.findFirst({ where: { OR: [{ id }, { slug: id }] } });
  if (!location) return json({ error: 'المكان غير موجود' }, { status: 404 });

  await prisma.location.update({
    where: { id: location.id },
    data: { verificationStatus: 'ARCHIVED' },
  });

  return json({ ok: true });
});
