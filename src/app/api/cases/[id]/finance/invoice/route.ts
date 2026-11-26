import { NextResponse } from 'next/server';
import { ApiError, handle } from '@/lib/api';
import { requireCaseFileAccess } from '@/lib/case-file-access';
import { INVOICE_TEXT, fmt, type Lang } from '@/lib/case-finance';
import { isFinanceManagement } from '@/lib/office-workflow';
import { newArabicPdf, pdfToBuffer, rtlLine, wrapLines } from '@/lib/pdf-rtl';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };
/** Invoice or receipt as an A4 PDF in Arabic, English or French (item 198). Invoice = an INVOICE entry; receipt = a PAYMENT entry. A document only: nothing is sent to the client. */
export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params; const a = await requireCaseFileAccess(id);
  if (!(await isFinanceManagement(a.session))) throw new ApiError(403, 'للإدارة المالية والعليا فقط');
  const sp = new URL(req.url).searchParams; const lang = (sp.get('lang') ?? 'ar') as Lang; if (!(lang in INVOICE_TEXT)) throw new ApiError(400, 'لغة غير مدعومة');
  const [e] = await prisma.$queryRawUnsafe<{ kind: string; amount: string; currency: string; created_at: string; note: string | null; status: string; number: string | null }[]>(`SELECT f."kind",f."amount"::text AS amount,f."currency",to_char(f."created_at",'YYYY-MM-DD') AS created_at,f."note",f."status",c."number" FROM "case_finance_entries" f JOIN "case_records" c ON c."id"=f."case_id" WHERE f."id"=$1 AND f."case_id"=$2 AND f."kind" IN ('INVOICE','PAYMENT')`, sp.get('entry') ?? '', id);
  if (!e) throw new ApiError(404, 'الفاتورة أو الإيصال غير موجود');
  if (e.status === 'CANCELLED') throw new ApiError(409, 'القيد ملغي');
  const T = INVOICE_TEXT[lang]; const doc = newArabicPdf(); const title = e.kind === 'INVOICE' ? T.invoice : T.receipt; const W = doc.page.width;
  const row = (l: string, v: string, y: number) => { if (lang === 'ar') { rtlLine(doc, l, W - 40, y, { font: 'bold', size: 11 }); rtlLine(doc, v, W - 160, y, { size: 11 }); } else { doc.font('bold').fontSize(11).text(l, 40, y); doc.font('reg').text(v, 160, y, { width: W - 200 }); } };
  if (lang === 'ar') rtlLine(doc, title, W - 40, 50, { font: 'bold', size: 20 }); else doc.font('bold').fontSize(20).text(title, 40, 50);
  row(T.case, e.number ?? id, 110); row(T.date, e.created_at, 135); row(T.amount, fmt(Math.round(Number(e.amount) * 100)) + ' ' + e.currency, 160);
  if (e.note) { let y = 185; for (const ln of wrapLines(doc, e.note, W - 200, 'reg', 11)) { row(y === 185 ? T.note : '', ln, y); y += 18; } }
  row(T.total, fmt(Math.round(Number(e.amount) * 100)) + ' ' + e.currency, 260);
  doc.font('reg').fontSize(9).fillColor('#666').text(T.footer, 40, 780, { align: 'center', width: W - 80 });
  const buf = await pdfToBuffer(doc);
  return new NextResponse(new Uint8Array(buf), { headers: { 'content-type': 'application/pdf', 'content-disposition': `inline; filename="${e.kind.toLowerCase()}-${lang}.pdf"` } });
});
