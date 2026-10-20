import { get } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { handle, json } from '@/lib/api';
import { isPrivateBlobUrl, requireClientFileAccess } from '@/lib/client-file-access';
import { prisma } from '@/lib/prisma';

type StoredFile = {
  name: string;
  mime_type: string | null;
  url: string | null;
};

function safeHeaderFilename(name: string) {
  return name
    .replace(/[\r\n"\\]/g, '_')
    .replace(/[^\x20-\x7E]/g, '_')
    .slice(0, 150) || 'download';
}

function encodeFilename(name: string) {
  return encodeURIComponent(name).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

const INLINE_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

export const GET = handle(async (
  request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) => {
  const { id, fileId } = await params;
  await requireClientFileAccess(id);

  const rows = await prisma.$queryRawUnsafe<StoredFile[]>(
    `SELECT "name", "mime_type", "url"
     FROM "client_files"
     WHERE "id" = $1 AND "client_id" = $2 AND "deleted_at" IS NULL
     LIMIT 1`,
    fileId,
    id,
  );
  const file = rows[0];
  if (!file || !isPrivateBlobUrl(file.url, id)) {
    return json({ error: 'الملف غير موجود' }, { status: 404 });
  }

  const blob = await get(file.url, { access: 'private' });
  if (!blob || blob.statusCode !== 200 || !blob.stream) {
    return json({ error: 'الملف غير موجود في التخزين' }, { status: 404 });
  }

  const blobType = (blob.blob.contentType || file.mime_type || 'application/octet-stream')
    .split(';', 1)[0]
    .trim()
    .toLowerCase();
  const safeInline = INLINE_TYPES.has(blobType);
  const forceDownload = new URL(request.url).searchParams.get('download') === '1';
  const disposition = forceDownload || !safeInline ? 'attachment' : 'inline';
  const contentType = safeInline ? blobType : 'application/octet-stream';

  return new NextResponse(blob.stream, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `${disposition}; filename="${safeHeaderFilename(file.name)}"; filename*=UTF-8''${encodeFilename(file.name)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});
