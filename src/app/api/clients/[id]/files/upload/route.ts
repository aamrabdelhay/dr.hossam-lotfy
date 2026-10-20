import { issueSignedToken, presignUrl } from '@vercel/blob';
import { handleUploadPresigned, type HandleUploadPresignedBody } from '@vercel/blob/client';
import { ApiError, handle, json } from '@/lib/api';
import { requireClientFileAccess } from '@/lib/client-file-access';

const MAX_CLIENT_FILE_BYTES = 100 * 1024 * 1024;

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

async function validateClientUploadPath(clientId: string, pathname: string) {
  await requireClientFileAccess(clientId);
  const prefix = `clients/${clientId}/`;
  if (
    !pathname.startsWith(prefix) ||
    pathname.includes('\\') ||
    pathname.includes('?') ||
    pathname.split('/').some((part) => !part || part === '.' || part === '..')
  ) {
    throw new ApiError(400, 'مسار الملف غير صالح');
  }

  const leaf = pathname.slice(prefix.length);
  if (!/^[a-f0-9-]{36}-/i.test(leaf)) {
    throw new ApiError(400, 'اسم الملف غير صالح');
  }

  const contentType = fileTypeFromPath(leaf);
  if (!contentType) {
    throw new ApiError(400, 'نوع الملف غير مدعوم. استخدم PNG أو JPG أو WebP أو PDF أو Word.');
  }
  if (!process.env.BLOB_STORE_ID && !process.env.BLOB_READ_WRITE_TOKEN) {
    throw new ApiError(503, 'تخزين الملفات غير متصل. اربط مخزن Vercel Blob الخاص بالمشروع.');
  }
  return contentType;
}

async function issueClientUploadToken(pathname: string, contentType: string, maxSize: number) {
  const validUntil = Date.now() + 10 * 60 * 1000;
  const token = await issueSignedToken({
    pathname,
    operations: ['put'],
    allowedContentTypes: [contentType],
    maximumSizeInBytes: maxSize,
    validUntil,
    abortSignal: AbortSignal.timeout(15_000),
  });
  return { token, validUntil };
}

export const POST = handle(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const startedAt = Date.now();
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    throw new ApiError(400, 'طلب رفع الملف غير صالح');
  }

  try {
    // Compatibility path for already-open clients using the Blob SDK event protocol.
    // The current client uses an explicit short-lived PUT URL to avoid the SDK payload
    // exchange and to expose the actual Blob API response on upload failure.
    if (body.type === 'blob.generate-presigned-url' || body.type === 'blob.upload-completed') {
      const sdkResponse = await handleUploadPresigned({
        body: body as HandleUploadPresignedBody,
        request,
        getSignedToken: async (pathname) => {
          const contentType = await validateClientUploadPath(id, pathname);
          const accessStartedAt = Date.now();
          const { token, validUntil } = await issueClientUploadToken(pathname, contentType, MAX_CLIENT_FILE_BYTES);
          console.info('[client-file-presigned-upload] Legacy SDK token issued', {
            accessAndTokenMs: Date.now() - accessStartedAt,
          });
          return {
            token,
            urlOptions: {
              allowedContentTypes: [contentType],
              maximumSizeInBytes: MAX_CLIENT_FILE_BYTES,
              validUntil,
              addRandomSuffix: false,
              allowOverwrite: false,
            },
          };
        },
      });
      return json(sdkResponse);
    }

    const pathname = typeof body.pathname === 'string' ? body.pathname : '';
    const requestedContentType = typeof body.contentType === 'string' ? body.contentType : '';
    const requestedSize = Number(body.size);
    if (!pathname) throw new ApiError(400, 'مسار الملف مطلوب');
    if (!Number.isSafeInteger(requestedSize) || requestedSize <= 0 || requestedSize > MAX_CLIENT_FILE_BYTES) {
      throw new ApiError(413, 'حجم الملف غير صالح أو يتجاوز الحد الأقصى البالغ 100 ميجابايت.');
    }

    const accessStartedAt = Date.now();
    const contentType = await validateClientUploadPath(id, pathname);
    console.info('[client-file-direct-upload] Access check completed', { durationMs: Date.now() - accessStartedAt });
    if (requestedContentType !== contentType) {
      throw new ApiError(400, 'نوع الملف لا يتوافق مع امتداده. اختر الملف الأصلي وحاول مرة أخرى.');
    }

    const tokenStartedAt = Date.now();
    const { token, validUntil } = await issueClientUploadToken(pathname, contentType, requestedSize);
    const { presignedUrl } = await presignUrl(token, {
      pathname,
      operation: 'put',
      validUntil,
      allowedContentTypes: [contentType],
      maximumSizeInBytes: requestedSize,
      addRandomSuffix: false,
      allowOverwrite: false,
      access: 'private',
    });
    console.info('[client-file-direct-upload] Direct URL prepared', {
      tokenAndSigningMs: Date.now() - tokenStartedAt,
      totalMs: Date.now() - startedAt,
    });
    return json({ presignedUrl, pathname, contentType, validUntil });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error('[client-file-direct-upload] Failed to prepare private upload:', error);
    throw new ApiError(
      502,
      'تعذر تجهيز رابط الرفع الخاص. أعد المحاولة، وإذا تكررت المشكلة فراجع سجل أخطاء التخزين.',
    );
  }
});
