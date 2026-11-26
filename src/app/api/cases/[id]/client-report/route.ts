import { NextResponse } from 'next/server';
import { ApiError, handle } from '@/lib/api';
import { requireCaseFileAccess } from '@/lib/case-file-access';
import { newArabicPdf, pdfToBuffer, rtlLine, wrapLines } from '@/lib/pdf-rtl';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };
/** Client-facing case progress PDF (item 214). Generated on request, never sent. Client-safe by construction: only the case number, upcoming dates (no internal notes, no task text, no files, no finance) and a summary the lawyer types in ?summary=. A lawyer must read it before sharing it. */
export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params; await requireCaseFileAccess(id);
  const summary = (new URL(req.url).searchParams.get('summary') ?? '').slice(0, 1500);
  const [c] = await prisma.$queryRawUnsafe<{ number: string; client_name: string | null }[]>(`SELECT "number","clientName" AS client_name FROM "case_records" WHERE "id"=$1`, id);
  if (!c) throw new ApiError(404, 'القضية غير موجودة');
  const dl = await prisma.$queryRawUnsafe<{ d: string }[]>(`SELECT to_char("due_date",'YYYY-MM-DD') AS d FROM "office_case_deadlines" WHERE "case_id"=$1 AND "status"='OPEN' AND "due_date">=CURRENT_DATE ORDER BY "due_date" LIMIT 10`, id);
  const ss = await prisma.$queryRawUnsafe<{ d: string; t: string | null }[]>(`SELECT to_char("scheduledDate",'YYYY-MM-DD') AS d, "scheduledTime" AS t FROM "tasks" WHERE "caseId"=$1 AND "status" IN ('PENDING','IN_PROGRESS') AND "scheduledDate">=CURRENT_DATE ORDER BY "scheduledDate" LIMIT 10`, id);
  const doc = newArabicPdf(); const W = doc.page.width; let y = 50;
  const line = (t: string, o: { font?: 'bold' | 'reg'; size?: number } = {}) => { rtlLine(doc, t, W - 40, y, { font: o.font ?? 'reg', size: o.size ?? 11 }); y += (o.size ?? 11) + 8; };
  line('Loutfi Law firm', { font: 'bold', size: 20 }); line('تقرير تطورات القضية', { font: 'bold', size: 16 });
  line('رقم القضية: ' + c.number); if (c.client_name) line('العميل: ' + c.client_name);
  y += 8; line('ملخص من المحامي', { font: 'bold', size: 13 });
  if (summary) for (const l of wrapLines(doc, summary, W - 80, 'reg', 11)) line(l); else line('لم يضف المحامي ملخصًا.');
  y += 8; line('المواعيد والجلسات القادمة', { font: 'bold', size: 13 });
  if (!dl.length && !ss.length) line('لا توجد مواعيد قادمة مسجلة.');
  for (const s of ss) line('جلسة / إجراء: ' + s.d + (s.t ? ' الساعة ' + s.t : ''));
  for (const d of dl) line('موعد قانوني مسجل: ' + d.d);
  doc.font('reg').fontSize(9).fillColor('#666').text('هذا التقرير للمتابعة فقط وليس رأيًا قانونيًا. يراجعه المحامي قبل تسليمه للعميل.', 40, 780, { align: 'center', width: W - 80 });
  const buf = await pdfToBuffer(doc);
  return new NextResponse(new Uint8Array(buf), { headers: { 'content-type': 'application/pdf', 'content-disposition': 'inline; filename="case-report.pdf"' } });
});
