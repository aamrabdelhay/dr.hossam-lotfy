import { put } from '@vercel/blob';
import crypto from 'node:crypto';
import { ApiError, handle, json, user } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { officeId } from '@/lib/office-workflow';
import { clientFileContentUrl, isPrivateBlobUrl, requireClientFileAccess } from '@/lib/client-file-access';
import { parsePrivateS3Url, verifyUploadedClientFile, MAX_CLIENT_FILE_BYTES as S3_MAX_CLIENT_FILE_BYTES } from '@/lib/client-file-s3';

type ClientFileRow = {
  id: string;
  name: string;
  kind: string;
  mime_type: string | null;
  size_bytes: number | null;
  url: string | null;
  text_content: string | null;
  created_at: Date | string;
};

const MAX_CLIENT_FILE_BYTES = S3_MAX_CLIENT_FILE_BYTES;
const MAX_SERVER_UPLOAD_BYTES = 4 * 1024 * 1024;

const FILE_TYPES: Record<string, { mime: string; kind: string }> = {
  '.png': { mime: 'image/png', kind: 'image' },
  '.jpg': { mime: 'image/jpeg', kind: 'image' },
  '.jpeg': { mime: 'image/jpeg', kind: 'image' },
  '.webp': { mime: 'image/webp', kind: 'image' },
  '.pdf': { mime: 'application/pdf', kind: 'pdf' },
  '.doc': { mime: 'application/msword', kind: 'word' },
  '.docx': {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    kind: 'word',
  },
};

const UPLOADED_FILE_KINDS = new Set(['image', 'pdf', 'word', 'file']);

function safeFilename(name: string) {
  return name
    .replace(/[\/\\]/g, '_')
    .replace(/[^\w.\-\u0600-\u06ff ]/g, '_')
    .slice(0, 180) || 'client-file';
}

function typeFromPrivateUrl(url: string) {
  try {
    const pathname = new URL(url).pathname;
    const extension = pathname.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
    return FILE_TYPES[extension] || null;
  } catch {
    return null;
  }
}

export const GET = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await requireClientFileAccess(id);

  const rows = await prisma.$queryRawUnsafe<ClientFileRow[]>(
    `SELECT "id", "name", "kind", "mime_type", "size_bytes", "url", "text_content", "created_at"
     FROM "client_files"
     WHERE "client_id" = $1 AND "deleted_at" IS NULL
     ORDER BY "created_at" DESC`,
    id,
  );

  return json({
    files: rows.map((file) => ({
      ...file,
      url: clientFileContentUrl(id, file.id, file.url),
    })),
  });
});

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const session = await user();
  if (!session) throw new ApiError(401, 'يجب تسجيل الدخول');
  await requireClientFileAccess(id);

  const requestType = req.headers.get('content-type') || '';
  let name = '';
  let kind = 'note';
  let mime: string | null = null;
  let size = 0;
  let url: string | null = null;
  let text: string | null = null;

  if (requestType.includes('multipart/form-data')) {
    // Compatibility for older clients. Large files must use the signed
    // direct-upload endpoint to avoid Vercel Function body-size limits.
    const form = await req.formData();
    const entry = form.get('file');
    if (!(entry instanceof File)) throw new ApiError(400, 'اختر ملفًا أولًا');

    const file = entry;
    const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
    const fileType = FILE_TYPES[extension];
    if (!fileType) {
      throw new ApiError(400, 'نوع الملف غير مدعوم. استخدم صورة PNG أو JPG أو WebP أو PDF أو Word.');
    }
    if (file.type && file.type !== fileType.mime) {
      throw new ApiError(400, 'نوع الملف لا يتوافق مع امتداده. اختر الملف الأصلي وحاول مرة أخرى.');
    }
    if (file.size <= 0) throw new ApiError(400, 'الملف فارغ');
    if (file.size > MAX_SERVER_UPLOAD_BYTES) {
      throw new ApiError(413, 'هذا المسار يقبل ملفات حتى 4 ميجابايت. استخدم زر الرفع داخل المنصة للملفات الأكبر.');
    }
    if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
      throw new ApiError(503, 'تخزين الملفات غير متصل. اربط مخزن Vercel Blob الخاص بالمشروع ثم أعد المحاولة.');
    }

    name = String(form.get('name') || file.name).trim();
    text = String(form.get('text') || '') || null;
    mime = fileType.mime;
    kind = fileType.kind;
    size = file.size;

    const pathname = `clients/${id}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
    try {
      const blob = await put(pathname, file, {
        access: 'private',
        contentType: fileType.mime,
        addRandomSuffix: false,
      });
      url = blob.url;
    } catch (error) {
      console.error('[client-file-upload] Blob upload failed:', error);
      throw new ApiError(502, 'تعذر رفع الملف إلى التخزين الخاص. تحقق من اتصال مخزن Vercel Blob ثم حاول مرة أخرى.');
    }
  } else {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') throw new ApiError(400, 'بيانات الملف غير صالحة');

    name = String(body.name || 'ملاحظة').trim();
    kind = String(body.kind || 'note');
    url = body.url ? String(body.url) : null;
    text = body.text ? String(body.text) : null;
    mime = body.mimeType ? String(body.mimeType) : null;
    size = Number(body.size || 0);

    if (UPLOADED_FILE_KINDS.has(kind)) {
      const s3Object = parsePrivateS3Url(url, id);
      if (!url || (!isPrivateBlobUrl(url, id) && !s3Object)) {
        throw new ApiError(400, 'رابط الملف الخاص غير صالح أو لا يتبع هذا العميل.');
      }
      const fileType = typeFromPrivateUrl(url);
      if (!fileType || mime !== fileType.mime) {
        throw new ApiError(400, 'نوع الملف لا يتوافق مع بيانات التخزين. أعد رفع الملف من داخل المنصة.');
      }
      if (!Number.isInteger(size) || size <= 0 || size > MAX_CLIENT_FILE_BYTES) {
        throw new ApiError(413, 'حجم الملف غير صالح أو يتجاوز الحد الأقصى البالغ 100 ميجابايت.');
      }
      if (s3Object) {
        const verified = await verifyUploadedClientFile(url, id, size, fileType.mime);
        if (!verified) {
          throw new ApiError(400, 'لم يتم العثور على الملف الصحيح في Amazon S3. أعد رفع الملف ثم حاول مرة أخرى.');
        }
      }
      kind = fileType.kind;
    } else if (url?.startsWith('s3://') && !parsePrivateS3Url(url, id)) {
      throw new ApiError(400, 'لا يمكن ربط ملف مخزّن في Amazon S3 بعميل آخر أو بمخزن مختلف.');
    } else if (url?.includes('.private.blob.vercel-storage.com') && !isPrivateBlobUrl(url, id)) {
      throw new ApiError(400, 'لا يمكن ربط ملف خاص بعميل آخر أو بمخزن مختلف.');
    }
  }

  if (!name) throw new ApiError(400, 'اسم الملف مطلوب');

  const fileId = officeId('clientfile');
  await prisma.$executeRawUnsafe(
    `INSERT INTO "client_files"
      ("id", "client_id", "name", "kind", "mime_type", "size_bytes", "url", "text_content", "created_by_user_id", "created_by_lawyer_id")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    fileId,
    id,
    name,
    kind,
    mime,
    size,
    url,
    text,
    session.role === 'admin' ? session.userId : null,
    session.role === 'lawyer' ? session.lawyerId : null,
  );

  return json({
    ok: true,
    id: fileId,
    kind,
    mimeType: mime,
    size,
    url: clientFileContentUrl(id, fileId, url),
  });
});
