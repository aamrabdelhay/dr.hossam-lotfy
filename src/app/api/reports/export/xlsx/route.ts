import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { createXlsx } from '@/lib/xlsx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ExportPayload = z.object({
  title: z.string().max(500).default('Report'),
  sheetName: z.string().max(31).default('Report'),
  language: z.enum(['ar', 'en', 'fr']).default('ar'),
  logoDataUrl: z.string().max(1_600_000).nullable().optional(),
  headers: z.array(z.string().max(250)).min(1).max(20),
  rows: z.array(z.array(z.string().max(12_000)).max(20)).max(10_000),
}).superRefine((payload, context) => {
  for (let index = 0; index < payload.rows.length; index++) {
    if (payload.rows[index].length !== payload.headers.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rows', index],
        message: 'Every row must have the same number of cells as the header.',
      });
      return;
    }
  }
});

export async function POST(request: Request) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: 'يجب تسجيل الدخول لتنزيل التقرير.' }, { status: 401 });

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 3_000_000) {
    return NextResponse.json({ error: 'حجم التقرير أكبر من الحد المسموح.' }, { status: 413 });
  }

  const body = await request.json().catch(() => null);
  const parsed = ExportPayload.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'بيانات التصدير غير صالحة.' }, { status: 400 });

  try {
    const payload = parsed.data;
    const file = createXlsx(payload.headers, payload.rows, payload.sheetName, {
      title: payload.title,
      language: payload.language,
      logoDataUrl: payload.logoDataUrl,
    });
    return new NextResponse(new Uint8Array(file), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="loutfi-report.xlsx"',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[reports/export/xlsx] failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'تعذر إنشاء ملف Excel.' }, { status: 500 });
  }
}
