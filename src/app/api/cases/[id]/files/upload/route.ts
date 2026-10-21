import { ApiError, handle, json } from '@/lib/api';
import { requireCaseFileAccess } from '@/lib/case-file-access';
import { createClientFileUploadPost, makePrivateS3Url, MAX_CLIENT_FILE_BYTES } from '@/lib/client-file-s3';

const FILE_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
};

function fileTypeFromPath(pathname: string) {
  const extension = pathname.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
  return FILE_TYPES[extension] || null;
}

export const POST = handle(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const startedAt = Date.now();
  const { id } = await params;
  await requireCaseFileAccess(id);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') throw new ApiError(400, 'طلب رفع الملف غير صالح');

  const pathname = typeof body.pathname === 'string' ? body.pathname : '';
  const requestedContentType = typeof body.contentType === 'string' ? body.contentType : '';
  const requestedSize = Number(body.size);
  if (!Number.isSafeInteger(requestedSize) || requestedSize <= 0 || requestedSize > MAX_CLIENT_FILE_BYTES) {
    throw new ApiError(413, 'حجم الملف غير صالح أو يتجاوز الحد الأقصى البالغ 100 ميجابايت.');
  }

  const prefix = `cases/${id}/`;
  if (!pathname.startsWith(prefix) || pathname.includes('\\') || pathname.includes('?') ||
      pathname.includes('#') || pathname.split('/').some((part: string) => !part || part === '.' || part === '..')) {
    throw new ApiError(400, 'مسار الملف غير صالح');
  }

  const leaf = pathname.slice(prefix.length);
  if (!/^[a-f0-9-]{36}-/i.test(leaf)) throw new ApiError(400, 'اسم الملف غير صالح');
  const contentType = fileTypeFromPath(leaf);
  if (!contentType) throw new ApiError(400, 'نوع الملف غير مدعوم. استخدم صورة أو PDF أو Word أو ملف صوت أو فيديو.');
  if (requestedContentType !== contentType) throw new ApiError(400, 'نوع الملف لا يتوافق مع امتداده.');

  try {
    const signed = await createClientFileUploadPost(pathname, contentType);
    console.info('[case-file-s3-upload] Signed private upload', { signingMs: Date.now() - startedAt, size: requestedSize });
    return json({
      uploadUrl: signed.url,
      fields: signed.fields,
      storedUrl: makePrivateS3Url(pathname),
      pathname,
      contentType,
      expiresIn: signed.expiresIn,
    });
  } catch (error) {
    console.error('[case-file-s3-upload] Failed to prepare upload:', error);
    throw new ApiError(502, error instanceof Error ? error.message : 'تعذر تجهيز رابط الرفع من Amazon S3.');
  }
});
