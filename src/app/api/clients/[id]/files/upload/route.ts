import { issueSignedToken } from '@vercel/blob';
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

const ALLOWED_CONTENT_TYPES = Object.values(FILE_TYPES);

export const POST = handle(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const startedAt = Date.now();
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    throw new ApiError(400, 'طلب رفع الملف غير صالح');
  }

  try {
    const response = await handleUploadPresigned({
      body: body as HandleUploadPresignedBody,
      request,
      getSignedToken: async (pathname) => {
        // Authentication is checked when issuing an upload token. The completion
        // webhook is handled by handleUploadPresigned using the Blob webhook key.
        // This helper performs both session and branch-scoped permission checks.
        // Avoid an extra session lookup before invoking it.
        const accessCheckStartedAt = Date.now();
        await requireClientFileAccess(id);
        console.info('[client-file-presigned-upload] Access check completed', { durationMs: Date.now() - accessCheckStartedAt });

        const prefix = `clients/${id}/`;
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
        const extension = leaf.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
        const contentType = FILE_TYPES[extension];
        if (!contentType) {
          throw new ApiError(400, 'نوع الملف غير مدعوم. استخدم PNG أو JPG أو WebP أو PDF أو Word.');
        }
        if (!process.env.BLOB_STORE_ID && !process.env.BLOB_READ_WRITE_TOKEN) {
          throw new ApiError(503, 'تخزين الملفات غير متصل. اربط مخزن Vercel Blob الخاص بالمشروع.');
        }

        const validUntil = Date.now() + 10 * 60 * 1000;
        const tokenStartedAt = Date.now();
        const token = await issueSignedToken({
          pathname,
          operations: ['put'],
          allowedContentTypes: [contentType],
          maximumSizeInBytes: MAX_CLIENT_FILE_BYTES,
          validUntil,
          abortSignal: AbortSignal.timeout(15_000),
        });
        console.info('[client-file-presigned-upload] Signed URL token issued', { durationMs: Date.now() - tokenStartedAt });

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

    console.info('[client-file-presigned-upload] Presigned URL prepared', { durationMs: Date.now() - startedAt });
    return json(response);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error('[client-file-presigned-upload] Failed:', error);
    throw new ApiError(
      502,
      'تعذر تجهيز رابط الرفع الآمن. تحقق من اتصال مخزن Vercel Blob ثم حاول مرة أخرى.',
    );
  }
});
