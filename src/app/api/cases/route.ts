import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handle, json, readJson, requirePermission, user } from '@/lib/api';
import { isDemoMode, DEMO_TAG } from '@/lib/demo-mode';

const LEGACY_META_PREFIX = '__ARCHIVED_CASE_META__';

export const GET = handle(async () => {
  const session = await user();
  if (!session) return json({ error: 'يجب تسجيل الدخول لعرض ملفات القضايا' }, { status: 401 });
  const cases = await prisma.caseRecord.findMany({
    orderBy: { id: 'desc' },
    take: 200,
    include: {
      events: { orderBy: { createdAt: 'desc' }, take: 100 },
      tasks: {
        where: { status: { not: 'CANCELLED' }, scheduledDate: { not: null } },
        orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
        select: {
          id: true,
          scheduledDate: true,
          scheduledTime: true,
          status: true,
          location: { select: { name: true } },
        },
      },
    },
  });
  return json({ cases });
});

const createSchema = z.object({
  name: z.string().min(1, 'اسم القضية مطلوب').max(300),
  number: z.string().min(1, 'رقم القضية مطلوب').max(200),
  clientName: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
  year: z.string().max(20).optional(),
  court: z.string().max(300).optional(),
  circuit: z.string().max(300).optional(),
  caseType: z.string().max(200).optional(),
  plaintiff: z.string().max(500).optional(),
  defendant: z.string().max(500).optional(),
  responsibleLawyer: z.string().max(300).optional(),
  status: z.string().max(200).optional(),
  filingDate: z.string().max(30).optional(),
  lastActionDate: z.string().max(30).optional(),
  judgmentDate: z.string().max(30).optional(),
  judgmentResult: z.string().max(2000).optional(),
});

export const POST = handle(async (req: Request) => {
  await requirePermission('writeTasks');
  const data = await readJson(req as never, createSchema);
  const demo = await isDemoMode();
  const meta = {
    year: data.year?.trim() || null,
    court: data.court?.trim() || null,
    circuit: data.circuit?.trim() || null,
    caseType: data.caseType?.trim() || null,
    plaintiff: data.plaintiff?.trim() || null,
    defendant: data.defendant?.trim() || null,
    responsibleLawyer: data.responsibleLawyer?.trim() || null,
    status: data.status?.trim() || null,
    filingDate: data.filingDate?.trim() || null,
    lastActionDate: data.lastActionDate?.trim() || null,
    judgmentDate: data.judgmentDate?.trim() || null,
    judgmentResult: data.judgmentResult?.trim() || null,
  };
  const hasMeta = Object.values(meta).some(Boolean);
  const notes = data.description?.trim() || '';
  const storedDescription = hasMeta
    ? `${LEGACY_META_PREFIX}${JSON.stringify(meta)}${notes ? `\n${notes}` : ''}`
    : notes || null;

  const c = await prisma.caseRecord.create({
    data: {
      name: demo ? `${data.name.trim()} ${DEMO_TAG}` : data.name.trim(),
      number: demo ? `DEMO-${data.number.trim()}` : data.number.trim(),
      description: storedDescription,
      clientName: data.clientName?.trim() || null,
    },
  });

  if (hasMeta || notes) {
    const labels: Array<[keyof typeof meta, string]> = [
      ['year', 'سنة القضية'],
      ['court', 'المحكمة'],
      ['circuit', 'الدائرة'],
      ['caseType', 'نوع القضية / التصنيف'],
      ['plaintiff', 'المدعي'],
      ['defendant', 'المدعى عليه'],
      ['responsibleLawyer', 'المحامي المسؤول'],
      ['status', 'حالة القضية'],
      ['filingDate', 'تاريخ القيد / بداية القضية'],
      ['lastActionDate', 'تاريخ آخر إجراء'],
      ['judgmentDate', 'تاريخ الحكم'],
      ['judgmentResult', 'نتيجة القضية / الحكم'],
    ];
    const details = labels
      .filter(([key]) => meta[key])
      .map(([key, label]) => `${label}: ${meta[key]}`)
      .join('\n');
    const eventDescription = [details, notes ? `ملاحظات: ${notes}` : ''].filter(Boolean).join('\n');
    await prisma.caseEvent.create({
      data: {
        caseId: c.id,
        description: eventDescription,
        type: 'historical_case_details',
        authorName: 'إضافة قضية قديمة',
      },
    });
  }

  return json({ ok: true, case: c, demo }, { status: 201 });
});
