import { get } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { handle, json } from '@/lib/api';
import { isPrivateBlobUrl, requireClientFileAccess } from '@/lib/client-file-access';
import { getPrivateS3Object, parsePrivateS3Url } from '@/lib/client-file-s3';
import { prisma } from '@/lib/prisma';

type StoredFile = { name: string; mime_type: string | null; url: string | null; };

function safeHeaderFilename(name: string) {
  return name.replace(/[\r\n"\\]/g, '_').replace(/[^\x20-\x7E]/g, '_').slice(0, 150) || 'download';
}
function encodeFilename(name: string) {
  return encodeURIComponent(name).replace(/[!'()*]/g, (char) => '%' + char.charCodeAt(0).toString(16).toUpperCase());
}
const INLINE_TYPES = new Set(['application/pdf','image/png','image/jpeg','image/webp']);

export const GET = handle(async (
  request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) => {
  const { id, fileId } = await params;
  await requireClientFileAccess(id);
  const rows = await prisma.$queryRawUnsafe<StoredFile[]>(
    'SELECT "name", "mime_type", "url"\nFROM "client_files"\nWHERE "id" = $1 AND "client_id" = $2 AND "deleted_at" IS NULL\nLIMIT 1',
    fileId, id,
  );
  const file = rows[0];
  const s3Object = file ? parsePrivateS3Url(file.url, id) : null;
  const blobUrl = file && isPrivateBlobUrl(file.url, id) ? file.url : null;
  if (!file || (!s3Object && !blobUrl)) return json({ error: 'الملف غير موجود' }, { status: 404 });

  let stream: ReadableStream<Uint8Array> | null = null;
  let storedContentType: string | null = null;
  if (s3Object) {
    try {
      const object = await getPrivateS3Object(file.url!, id);
      if (!object?.Body) return json({ error: 'الملف غير موجود في التخزين' }, { status: 404 });
      stream = object.Body.transformToWebStream() as ReadableStream<Uint8Array>;
      storedContentType = object.ContentType || null;
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (status === 404) return json({ error: 'الملف غير موجود في Amazon S3' }, { status: 404 });
      console.error('[client-file-s3] Failed to read private client object:', error);
      return json({ error: 'تعذر تحميل الملف من Amazon S3' }, { status: 502 });
    }
  } else {
    const blob = await get(blobUrl!, { access: 'private' });
    if (!blob || blob.statusCode !== 200 || !blob.stream) return json({ error: 'الملف غير موجود في التخزين' }, { status: 404 });
    stream = blob.stream;
    storedContentType = blob.blob.contentType || null;
  }

  const blobType = (storedContentType || file.mime_type || 'application/octet-stream').split(';',1)[0].trim().toLowerCase();
  const safeInline = INLINE_TYPES.has(blobType);
  const forceDownload = new URL(request.url).searchParams.get('download') === '1';
  const disposition = forceDownload || !safeInline ? 'attachment' : 'inline';
  return new NextResponse(stream, {
    headers: {
      'Content-Type': safeInline ? blobType : 'application/octet-stream',
      'Content-Disposition': disposition + '; filename="' + safeHeaderFilename(file.name) + '"; filename*=UTF-8\'\'' + encodeFilename(file.name),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});
