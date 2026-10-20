import { issueSignedToken } from '@vercel/blob';
import { handleUploadPresigned, type HandleUploadPresignedBody } from '@vercel/blob/client';
import { randomUUID } from 'node:crypto';

export async function POST(request: Request) {
  if (process.env.VERCEL_ENV !== 'preview') return new Response(null, { status: 404 });
  if (request.headers.get('x-upload-diagnostic-key') !== 'preview-only-blob-check-20261020') return new Response(null, { status: 404 });

  const pathname = `clients/diagnostic/${randomUUID()}-blob-check.txt`;
  const validUntil = Date.now() + 2 * 60 * 1000;
  try {
    const started = Date.now();
    const response = await handleUploadPresigned({
      body: {
        type: 'blob.generate-presigned-url',
        payload: { pathname, clientPayload: null, multipart: false },
      } as HandleUploadPresignedBody,
      request,
      getSignedToken: async (requestedPathname) => {
        const token = await issueSignedToken({
          pathname: requestedPathname,
          operations: ['put'],
          validUntil,
          allowedContentTypes: ['text/plain'],
          maximumSizeInBytes: 128,
          abortSignal: AbortSignal.timeout(15000),
        });
        return {
          token,
          urlOptions: {
            validUntil,
            allowedContentTypes: ['text/plain'],
            maximumSizeInBytes: 128,
            addRandomSuffix: false,
            allowOverwrite: false,
          },
        };
      },
    });
    return Response.json({
      ok: Boolean(response.presignedUrlPayload),
      durationMs: Date.now() - started,
      type: response.type,
      hasPresignedUrlPayload: Boolean(response.presignedUrlPayload),
      payloadKeys: response.presignedUrlPayload ? Object.keys(response.presignedUrlPayload) : [],
    });
  } catch (error) {
    return Response.json({
      ok: false,
      errorName: error instanceof Error ? error.name : 'UnknownError',
      error: error instanceof Error ? error.message.slice(0, 400) : 'Unknown Blob upload diagnostic error',
    }, { status: 502 });
  }
}
