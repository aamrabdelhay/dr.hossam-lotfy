import { issueSignedToken } from '@vercel/blob';
import { handleUploadPresigned, type HandleUploadPresignedBody } from '@vercel/blob/client';
import { randomUUID } from 'node:crypto';

export async function POST(request: Request) {
  // Temporary endpoint for a text-only SDK reproduction. Disabled outside Preview.
  if (process.env.VERCEL_ENV !== 'preview') return new Response(null, { status: 404 });
  if (request.headers.get('x-upload-diagnostic-key') !== 'preview-sdk-repro-only-20261020') {
    return new Response(null, { status: 404 });
  }

  const input = await request.json().catch(() => null) as { pathname?: unknown } | null;
  const suppliedPath = typeof input?.pathname === 'string' ? input.pathname : `diagnostics/${randomUUID()}-sdk-check.txt`;
  if (!/^diagnostics\/[a-f0-9-]{36}-sdk-check\.txt$/i.test(suppliedPath)) {
    return Response.json({ error: 'Invalid diagnostic pathname' }, { status: 400 });
  }

  try {
    const body: HandleUploadPresignedBody = {
      type: 'blob.generate-presigned-url',
      payload: { pathname: suppliedPath, clientPayload: null, multipart: false },
    };
    const response = await handleUploadPresigned({
      body,
      request,
      getSignedToken: async (pathname) => {
        const validUntil = Date.now() + 5 * 60 * 1000;
        const token = await issueSignedToken({
          pathname,
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
    if (!('presignedUrlPayload' in response)) {
      return Response.json({ error: 'Unexpected diagnostic event' }, { status: 400 });
    }
    return Response.json({ presignedUrlPayload: response.presignedUrlPayload });
  } catch (error) {
    console.error('[preview-sdk-upload-diagnostic] Failed', error);
    return Response.json({
      error: error instanceof Error ? error.message.slice(0, 250) : 'Unknown diagnostic error',
    }, { status: 502 });
  }
}
