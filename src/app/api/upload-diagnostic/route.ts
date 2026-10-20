import { issueSignedToken } from '@vercel/blob';
import { handleUploadPresigned, type HandleUploadPresignedBody } from '@vercel/blob/client';
import { randomUUID } from 'node:crypto';

export async function POST(request: Request) {
  if (process.env.VERCEL_ENV !== 'preview') return new Response(null, { status: 404 });
  if (request.headers.get('x-upload-diagnostic-key') !== 'preview-sdk-repro-only-20261020') {
    return new Response(null, { status: 404 });
  }

  const body = await request.json().catch(() => null) as HandleUploadPresignedBody | null;
  const pathname = body?.type === 'blob.generate-presigned-url'
    ? (body.payload as { pathname?: unknown } | undefined)?.pathname
    : undefined;
  if (typeof pathname !== 'string' || !/^diagnostics\/[a-f0-9-]{36}-sdk-check\.txt$/i.test(pathname)) {
    return Response.json({ error: 'Invalid diagnostic payload/path' }, { status: 400 });
  }

  try {
    const response = await handleUploadPresigned({
      body,
      request,
      getSignedToken: async (requestedPathname) => {
        const validUntil = Date.now() + 5 * 60 * 1000;
        const token = await issueSignedToken({
          pathname: requestedPathname,
          operations: ['put'],
          validUntil,
          allowedContentTypes: ['text/plain'],
          maximumSizeInBytes: 1024,
          abortSignal: AbortSignal.timeout(15000),
        });
        return {
          token,
          urlOptions: {
            validUntil,
            allowedContentTypes: ['text/plain'],
            maximumSizeInBytes: 1024,
            addRandomSuffix: false,
            allowOverwrite: false,
          },
        };
      },
    });
    return Response.json(response);
  } catch (error) {
    console.error('[preview-sdk-upload-diagnostic] Failed', error);
    return Response.json({
      error: error instanceof Error ? error.message.slice(0, 250) : 'Unknown diagnostic error',
    }, { status: 502 });
  }
}
