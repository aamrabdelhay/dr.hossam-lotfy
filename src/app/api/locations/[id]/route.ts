import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handle, json, readJson, requirePermission } from '@/lib/api';
import { logActivity } from '@/lib/activity';

type Ctx = { params: Promise<{ id: string }> };

const LOCATION_TYPES = [
  'COURT', 'TAX_OFFICE', 'COMMERCIAL_REGISTRY', 'CIVIL_REGISTRY', 'PROSECUTION',
  'LAWYERS_SYNDICATE', 'SURVEY_AUTHORITY', 'PASSPORTS', 'TRAFFIC', 'SOCIAL_INSURANCE',
  'LABOR_OFFICE', 'CUSTOMS', 'INVESTMENT_AGENCY', 'EXPERTS_OFFICE',
  'REAL_ESTATE_REGISTRATION', 'GOVERNMENT_AGENCY', 'OTHER',
] as const;

const optionalText = (max: number) => z.string().max(max).optional().nullable();

const updateSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  nameEn: optionalText(150),
  type: z.enum(LOCATION_TYPES).optional(),
  subType: optionalText(100),
  governorate: optionalText(80),
  city: optionalText(80),
  district: optionalText(80),
  address: optionalText(300),
  phone: optionalText(30),
  email: optionalText(120),
  website: optionalText(200),
  googleMapsUrl: optionalText(500),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  workingHours: optionalText(200),
  services: z.array(z.string().max(120)).max(30).optional(),
  jurisdiction: optionalText(300),
  requiresPersonal: z.boolean().optional(),
  hasOnlineService: z.boolean().optional(),
  source: optionalText(200),
  confidence: optionalText(40),
  distanceFromDokki: z.number().min(0).max(5000).nullable().optional(),
  distanceBucket: optionalText(20),
  buildingId: optionalText(100),
  description: optionalText(1000),
  searchKeywords: z.array(z.string().max(60)).max(40).optional(),
});

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const session = await requirePermission('manageLocations');
  const location = await prisma.location.findUnique({ where: { id } });
  if (!location) return json({ error: 'المكان غير موجود' }, { status: 404 });

  const data = await readJson(req as never, updateSchema);
  const clean = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, typeof v === 'string' && v.trim() === '' ? null : v]),
  );
  const updated = await prisma.location.update({ where: { id }, data: clean });
  await logActivity({
    action: 'EDITED',
    summary: `عدّل بيانات مكان: ${updated.name}`,
    locationId: id,
    byUserId: session.userId,
  });
  return json({ ok: true, location: updated });
});

export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const session = await requirePermission('manageLocations');
  const location = await prisma.location.findUnique({ where: { id }, include: { tasks: true } });
  if (!location) return json({ error: 'المكان غير موجود' }, { status: 404 });
  if (location.tasks.length > 0) {
    return json({ error: 'لا يمكن حذف مكان له جلسات أو مهام مسجلة. انقلها أولاً أو احذف المهام.' }, { status: 409 });
  }
  await prisma.location.delete({ where: { id } });
  await logActivity({ action: 'DELETED', summary: `حذف مكاناً: ${location.name}`, byUserId: session.userId });
  return json({ ok: true });
});
