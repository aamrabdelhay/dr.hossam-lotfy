import { get } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { handle, json } from '@/lib/api';
import { isPrivateLawyerPhotoBlobUrl, lawyerPhotoReference } from '@/lib/lawyer-photo';
import { prisma } from '@/lib/prisma';

const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export const GET = handle(async (request: Request) => {
  const source = new URL(request.url).searchParams.get('source');
  if (!isPrivateLawyerPhotoBlobUrl(source)) {
    return json({ error: 'الصورة غير موجودة' }, { status: 404 });
  }

  // Only photos explicitly assigned to a lawyer profile may be served publicly.
  const reference = lawyerPhotoReference(source);
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT "id" FROM "lawyers"
     WHERE "profilePhotoUrl" = $1 OR "coverPhotoUrl" = $1
     LIMIT 1`,
    reference,
  );
  if (!rows.length) return json({ error: 'الصورة غير موجودة' }, { status: 404 });

  const blob = await get(source, { access: 'private' });
  if (!blob || blob.statusCode !== 200 || !blob.stream) {
    return json({ error: 'الصورة غير موجودة في التخزين' }, { status: 404 });
  }

  const contentType = (blob.blob.contentType || '').split(';', 1)[0].trim().toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    return json({ error: 'نوع الصورة غير مدعوم' }, { status: 415 });
  }

  return new NextResponse(blob.stream, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=60, s-maxage=300',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Cross-Origin-Resource-Policy': 'same-site',
    },
  });
});
