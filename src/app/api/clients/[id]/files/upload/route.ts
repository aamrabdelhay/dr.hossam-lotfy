import { issueSignedToken } from '@vercel/blob';
import { handleUploadPresigned, type HandleUploadPresignedBody } from '@vercel/blob/client';
import { ApiError, handle, json, user } from '@/lib/api';
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
        const session = await user();
        if (!session) throw new ApiError(401, 'يجب تسجيل الدخول لرفع ملف');
        await requireClientFileAccess(id);

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
        const token = await issueSignedToken({
          pathname,
          operations: ['put'],
          allowedContentTypes: [contentType],
          maximumSizeInBytes: MAX_CLIENT_FILE_BYTES,
          validUntil,
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
