import { ApiError, handle, json } from '@/lib/api';
import { requireClientFileAccess } from '@/lib/client-file-access';
import {
  createClientFileUploadPost,
  makePrivateS3Url,
  MAX_CLIENT_FILE_BYTES,
} from '@/lib/client-file-s3';

const FILE_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

function fileTypeFromPath(pathname: string) {
  const extension = pathname.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
  return FILE_TYPES[extension] || null;
}

export const POST = handle(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const startedAt = Date.now();
  const { id } = await params;
  await requireClientFileAccess(id);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') throw new ApiError(400, 'طلب رفع الملف غير صالح');

  const pathname = typeof body.pathname === 'string' ? body.pathname : '';
  const requestedContentType = typeof body.contentType === 'string' ? body.contentType : '';
  const requestedSize = Number(body.size);
  if (!pathname) throw new ApiError(400, 'مسار الملف مطلوب');
  if (!Number.isSafeInteger(requestedSize) || requestedSize <= 0 || requestedSize > MAX_CLIENT_FILE_BYTES) {
    throw new ApiError(413, 'حجم الملف غير صالح أو يتجاوز الحد الأقصى البالغ 100 ميجابايت.');
  }

  const prefix = 'clients/' + id + '/';
  if (!pathname.startsWith(prefix) || pathname.includes('\\') || pathname.includes('?') ||
      pathname.includes('#') || pathname.split('/').some((part: string) => !part || part === '.' || part === '..')) {
    throw new ApiError(400, 'مسار الملف غير صالح');
  }

  const leaf = pathname.slice(prefix.length);
  if (!/^[a-f0-9-]{36}-/i.test(leaf)) throw new ApiError(400, 'اسم الملف غير صالح');
  const contentType = fileTypeFromPath(leaf);
  if (!contentType) throw new ApiError(400, 'نوع الملف غير مدعوم. استخدم PNG أو JPG أو WebP أو PDF أو Word.');
  if (requestedContentType !== contentType) throw new ApiError(400, 'نوع الملف لا يتوافق مع امتداده. اختر الملف الأصلي وحاول مرة أخرى.');

  try {
    const signed = await createClientFileUploadPost(pathname, contentType);
    console.info('[client-file-s3-upload] Signed private S3 form created', { signingMs: Date.now() - startedAt, size: requestedSize });
    return json({
      uploadUrl: signed.url,
      fields: signed.fields,
      storedUrl: makePrivateS3Url(pathname),
      pathname,
      contentType,
      expiresIn: signed.expiresIn,
    });
  } catch (error) {
    console.error('[client-file-s3-upload] Failed to prepare Amazon S3 upload:', error);
    throw new ApiError(502, error instanceof Error ? error.message : 'تعذر تجهيز رابط الرفع من Amazon S3. أعد المحاولة.');
  }
});
