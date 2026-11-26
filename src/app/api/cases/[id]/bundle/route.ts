import { NextResponse } from 'next/server';
import { ApiError, handle, readJson } from '@/lib/api';
import { logAuditEvent } from '@/lib/audit';
import { requireCaseFileAccess } from '@/lib/case-file-access';
import { mergeBundle, type BundlePart } from '@/lib/court-bundle-core';
import { drawCover, drawWatermark, readCaseFileBytes } from '@/lib/court-bundle';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
type Ctx = { params: Promise<{ id: string }> };
const body = z.object({ title: z.string().trim().min(1).max(200).default('حزمة مستندات للمحكمة'), fileIds: z.array(z.string().min(1)).min(1).max(60), watermark: z.string().trim().min(1).max(40).optional() });
const MAX_TOTAL = 80 * 1024 * 1024;

/** Court bundle (item 124): the caller picks and orders case files; the same case wall as opening a single file applies. The result is one PDF with an index page and page numbers. Unsupported files are listed on the index, never dropped silently. */
export const POST = handle(async (request: Request, { params }: Ctx) => {
  const { id } = await params;
  const access = await requireCaseFileAccess(id);
  const input = body.parse(await readJson(request, body));
  const rows = await prisma.$queryRawUnsafe<{ id: string; name: string; mime_type: string | null; url: string | null }[]>(
    `SELECT "id","name","mime_type","url" FROM "case_files" WHERE "case_id"=$1 AND "id"=ANY($2::text[]) AND "deleted_at" IS NULL`, id, input.fileIds);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const missing = input.fileIds.filter((f) => !byId.has(f));
  if (missing.length) throw new ApiError(404, 'بعض الملفات غير موجودة في هذه القضية');
  const parts: BundlePart[] = []; let total = 0;
  for (const fid of input.fileIds) {
    const f = byId.get(fid)!;
    let bytes: Uint8Array | null;
    try { bytes = await readCaseFileBytes(f.url, id); } catch { throw new ApiError(502, 'تعذر قراءة ملف من مخزن الملفات: ' + f.name); }
    if (!bytes) throw new ApiError(404, 'ملف غير صالح أو غير موجود: ' + f.name);
    total += bytes.length; if (total > MAX_TOTAL) throw new ApiError(413, 'حجم الحزمة أكبر من الحد المسموح');
    parts.push({ title: f.name, mime: f.mime_type, bytes });
  }
  const [c] = await prisma.$queryRawUnsafe<{ name: string; number: string | null }[]>(`SELECT "name","number" FROM "case_records" WHERE "id"=$1`, id);
  const who = access.session.role === 'admin' ? access.session.userId : (access.session.lawyerId ?? '');
  const meta = { caseName: c?.name ?? '', caseNumber: c?.number ?? '', title: input.title, generatedBy: String(who) };
  const stamp = input.watermark ? await drawWatermark(input.watermark) : undefined;
  // pass 1 finds the page ranges, pass 2 redraws the cover with them (the cover has the same page count both times)
  const first = await mergeBundle(await drawCover({ ...meta, rows: parts.map((p) => ({ title: p.title })) }), parts, stamp);
  const second = await mergeBundle(await drawCover({ ...meta, rows: parts.map((p) => { const inc = first.included.find((x) => x.title === p.title); const sk = first.skipped.find((x) => x.title === p.title); return { title: p.title, startPage: inc?.startPage, pages: inc?.pages, note: sk?.reason }; }) }), parts, stamp);
  await logAuditEvent({ actorUserId: access.session.role === 'admin' ? access.session.userId : null, actorLawyerId: access.session.role === 'lawyer' ? access.session.lawyerId : null, action: 'CASE_BUNDLE_EXPORTED', resourceType: 'case', resourceId: id, summary: 'تم تجهيز حزمة مستندات للمحكمة (' + second.included.length + ' ملف)', metadata: { caseId: id, fileIds: input.fileIds, skipped: second.skipped.length, watermark: !!input.watermark }, ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null, userAgent: request.headers.get('user-agent') || null });
  return new NextResponse(Buffer.from(second.pdf), { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="court-bundle.pdf"', 'Cache-Control': 'private, no-store', 'X-Bundle-Skipped': String(second.skipped.length) } });
});
