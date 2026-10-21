import { ApiError, handle, json, readJson } from '@/lib/api';
import { requireCaseFileAccess } from '@/lib/case-file-access';
import { officeId } from '@/lib/office-workflow';
import { prisma } from '@/lib/prisma';
import { parsePrivateS3UrlForPrefix, verifyUploadedPrivateS3File, MAX_CLIENT_FILE_BYTES } from '@/lib/client-file-s3';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type CaseFileRow = {
  id: string;
  name: string;
  kind: string;
  mime_type: string | null;
  size_bytes: number | null;
  url: string | null;
  created_at: Date | string;
};

const FILE_TYPES: Record<string, { mime: string; kind: string }> = {
  '.png': { mime: 'image/png', kind: 'image' },
  '.jpg': { mime: 'image/jpeg', kind: 'image' },
  '.jpeg': { mime: 'image/jpeg', kind: 'image' },
  '.webp': { mime: 'image/webp', kind: 'image' },
  '.pdf': { mime: 'application/pdf', kind: 'pdf' },
  '.doc': { mime: 'application/msword', kind: 'word' },
  '.docx': { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', kind: 'word' },
  '.mp4': { mime: 'video/mp4', kind: 'video' },
  '.webm': { mime: 'video/webm', kind: 'video' },
  '.mp3': { mime: 'audio/mpeg', kind: 'audio' },
  '.wav': { mime: 'audio/wav', kind: 'audio' },
  '.ogg': { mime: 'audio/ogg', kind: 'audio' },
};

const createSchema = z.object({
  name: z.string().trim().min(1, 'اسم الملف مطلوب').max(240),
  mimeType: z.string().min(1).max(180),
  size: z.number().int().positive().max(MAX_CLIENT_FILE_BYTES),
  url: z.string().min(1).max(2048),
});

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_request: Request, { params }: Ctx) => {
  const { id } = await params;
  await requireCaseFileAccess(id);
  const rows = await prisma.$queryRawUnsafe<CaseFileRow[]>(
    `SELECT "id", "name", "kind", "mime_type", "size_bytes", "url", "created_at"
       FROM "case_files"
      WHERE "case_id" = $1 AND "deleted_at" IS NULL
      ORDER BY "created_at" DESC
      LIMIT 300`,
    id,
  );
  const prefix = `cases/${id}/`;
  return json({
    files: rows.map((file) => ({
      ...file,
      size_bytes: file.size_bytes === null ? null : Number(file.size_bytes),
      url: parsePrivateS3UrlForPrefix(file.url, prefix)
        ? `/api/cases/${encodeURIComponent(id)}/files/${encodeURIComponent(file.id)}/content`
        : null,
    })),
  }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
});

export const POST = handle(async (request: Request, { params }: Ctx) => {
  const { id } = await params;
  const { session } = await requireCaseFileAccess(id);
  const data = await readJson(request, createSchema);
  const extension = data.name.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
  const fileType = FILE_TYPES[extension];
  if (!fileType || data.mimeType.toLowerCase() !== fileType.mime) {
    throw new ApiError(400, 'نوع الملف لا يتوافق مع امتداده. أعد رفع الملف الأصلي.');
  }

  const prefix = `cases/${id}/`;
  if (!parsePrivateS3UrlForPrefix(data.url, prefix)) {
    throw new ApiError(400, 'رابط الملف الخاص غير صالح أو لا يتبع هذه القضية.');
  }
  const valid = await verifyUploadedPrivateS3File(data.url, prefix, data.size, fileType.mime);
  if (!valid) throw new ApiError(400, 'لم يتم التحقق من الملف في مخزن Amazon S3. أعد رفعه ثم حاول مرة أخرى.');

  const fileId = officeId('casefile');
  await prisma.$executeRawUnsafe(
    `INSERT INTO "case_files"
      ("id", "case_id", "name", "kind", "mime_type", "size_bytes", "url", "created_by_user_id", "created_by_lawyer_id")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    fileId,
    id,
    data.name,
    fileType.kind,
    fileType.mime,
    data.size,
    data.url,
    session.role === 'admin' ? session.userId : null,
    session.role === 'lawyer' ? session.lawyerId : null,
  );

  return json({
    ok: true,
    file: {
      id: fileId,
      name: data.name,
      kind: fileType.kind,
      mime_type: fileType.mime,
      size_bytes: data.size,
      url: `/api/cases/${encodeURIComponent(id)}/files/${encodeURIComponent(fileId)}/content`,
      created_at: new Date().toISOString(),
    },
  }, { status: 201 });
});
