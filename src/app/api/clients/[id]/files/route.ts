import { put } from '@vercel/blob';
import crypto from 'node:crypto';
import { ApiError, handle, json, user } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { officeId } from '@/lib/office-workflow';
import { clientFileContentUrl, requireClientFileAccess } from '@/lib/client-file-access';

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

function safeFilename(name: string) {
  return name
    .replace(/[\/\\]/g, '_')
    .replace(/[^\w.\-\u0600-\u06ff ]/g, '_')
    .slice(0, 180) || 'client-file';
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
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new ApiError(503, 'تخزين الملفات غير مضبوط على Vercel (BLOB_READ_WRITE_TOKEN)');
    }

    name = String(form.get('name') || file.name).trim();
    text = String(form.get('text') || '') || null;
    mime = fileType.mime;
    kind = fileType.kind;
    size = file.size;

    const pathname = `clients/${id}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
    const blob = await put(pathname, file, {
      access: 'private',
      contentType: fileType.mime,
      addRandomSuffix: false,
    });
    url = blob.url;
  } else {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') throw new ApiError(400, 'بيانات الملف غير صالحة');
    name = String(body.name || 'ملاحظة');
    kind = String(body.kind || 'note');
    url = body.url ? String(body.url) : null;
    text = body.text ? String(body.text) : null;
    mime = body.mimeType ? String(body.mimeType) : null;
    size = Number(body.size || 0);
  }

  if (!name.trim()) throw new ApiError(400, 'اسم الملف مطلوب');

  const fileId = officeId('clientfile');
  await prisma.$executeRawUnsafe(
    `INSERT INTO "client_files"
      ("id", "client_id", "name", "kind", "mime_type", "size_bytes", "url", "text_content", "created_by_user_id", "created_by_lawyer_id")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    fileId,
    id,
    name.trim(),
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
    url: clientFileContentUrl(id, fileId, url),
  });
});
