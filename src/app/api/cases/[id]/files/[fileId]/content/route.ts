import { NextResponse } from 'next/server';
import { handle, json } from '@/lib/api';
import { requireCaseFileAccess } from '@/lib/case-file-access';
import { getPrivateS3ObjectForPrefix, parsePrivateS3UrlForPrefix } from '@/lib/client-file-s3';
import { prisma } from '@/lib/prisma';

type StoredFile = { name: string; mime_type: string | null; url: string | null };

function safeHeaderFilename(name: string) {
  return name.replace(/[\r\n"\\]/g, '_').replace(/[^\x20-\x7E]/g, '_').slice(0, 150) || 'case-file';
}
function encodeFilename(name: string) {
  return encodeURIComponent(name).replace(/[!'()*]/g, (char) =>
    '%' + char.charCodeAt(0).toString(16).toUpperCase(),
  );
}

const INLINE_TYPES = new Set([
  'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
  'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav', 'audio/ogg',
]);

type Ctx = { params: Promise<{ id: string; fileId: string }> };

export const GET = handle(async (request: Request, { params }: Ctx) => {
  const { id, fileId } = await params;
  await requireCaseFileAccess(id);
  const rows = await prisma.$queryRawUnsafe<StoredFile[]>(
    `SELECT "name", "mime_type", "url" FROM "case_files"
      WHERE "id" = $1 AND "case_id" = $2 AND "deleted_at" IS NULL LIMIT 1`,
    fileId,
    id,
  );
  const file = rows[0];
  const prefix = `cases/${id}/`;
  if (!file || !parsePrivateS3UrlForPrefix(file.url, prefix)) {
    return json({ error: 'ملف القضية غير موجود' }, { status: 404 });
  }

  let stream: ReadableStream<Uint8Array> | null = null;
  let storedContentType: string | null = null;
  let storedContentLength: number | null = null;
  let contentRange: string | null = null;
  try {
    const range = request.headers.get('range') || undefined;
    const object = await getPrivateS3ObjectForPrefix(file.url!, prefix, range);
    if (!object?.Body) return json({ error: 'الملف غير موجود في مخزن الملفات' }, { status: 404 });
    stream = object.Body.transformToWebStream() as ReadableStream<Uint8Array>;
    storedContentType = object.ContentType || null;
    storedContentLength = object.ContentLength ?? null;
    contentRange = object.ContentRange || null;
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status === 404) return json({ error: 'الملف غير موجود في Amazon S3' }, { status: 404 });
    if (status === 416) return new NextResponse(null, { status: 416, headers: { 'Accept-Ranges': 'bytes' } });
    console.error('[case-file-s3] Failed to read private case file:', error);
    return json({ error: 'تعذر تحميل ملف القضية من مخزن الملفات' }, { status: 502 });
  }

  const mimeType = (storedContentType || file.mime_type || 'application/octet-stream').split(';', 1)[0].trim().toLowerCase();
  const canDisplayInline = INLINE_TYPES.has(mimeType);
  const forceDownload = new URL(request.url).searchParams.get('download') === '1';
  const disposition = forceDownload || !canDisplayInline ? 'attachment' : 'inline';
  const headers: Record<string, string> = {
    'Content-Type': canDisplayInline ? mimeType : 'application/octet-stream',
    'Content-Disposition': disposition + '; filename="' + safeHeaderFilename(file.name) + '"; filename*=UTF-8\'\'' + encodeFilename(file.name),
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    'Accept-Ranges': 'bytes',
  };
  if (storedContentLength !== null) headers['Content-Length'] = String(storedContentLength);
  if (contentRange) headers['Content-Range'] = contentRange;
  return new NextResponse(stream, { status: contentRange ? 206 : 200, headers });
});
