import { issueSignedToken, presignUrl } from '@vercel/blob';
import { randomUUID } from 'node:crypto';

export async function POST(request: Request) {
  if (process.env.VERCEL_ENV !== 'preview') return new Response(null, { status: 404 });
  if (request.headers.get('x-upload-diagnostic-key') !== 'preview-only-blob-check-20261020') return new Response(null, { status: 404 });

  const result: Record<string, unknown> = {
    environment: process.env.VERCEL_ENV,
    hasOidcToken: Boolean(process.env.VERCEL_OIDC_TOKEN),
    hasReadWriteToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    hasStoreId: Boolean(process.env.BLOB_STORE_ID),
    hasWebhookPublicKey: Boolean(process.env.BLOB_WEBHOOK_PUBLIC_KEY),
  };
  const pathname = `diagnostics/${randomUUID()}-blob-check.txt`;
  const validUntil = Date.now() + 2 * 60 * 1000;
  let putSucceeded = false;

  try {
    const started = Date.now();
    const issued = await issueSignedToken({
      pathname,
      operations: ['put', 'delete'],
      validUntil,
      allowedContentTypes: ['text/plain'],
      maximumSizeInBytes: 128,
      abortSignal: AbortSignal.timeout(15000),
    });
    result.tokenIssuanceMs = Date.now() - started;

    const putUrl = await presignUrl(issued, { pathname, operation: 'put', validUntil });
    const putResponse = await fetch(putUrl.presignedUrl, {
      method: 'PUT',
      headers: { 'content-type': 'text/plain' },
      body: 'temporary private Blob upload diagnostic',
      signal: AbortSignal.timeout(15000),
    });
    result.putStatus = putResponse.status;
    if (!putResponse.ok) {
      result.putError = (await putResponse.text().catch(() => '')).slice(0, 300);
      return Response.json(result, { status: 502 });
    }
    putSucceeded = true;

    const deleteUrl = await presignUrl(issued, { pathname, operation: 'delete', validUntil });
    const deleteResponse = await fetch(deleteUrl.presignedUrl, { method: 'DELETE', signal: AbortSignal.timeout(15000) });
    result.deleteStatus = deleteResponse.status;
    if (!deleteResponse.ok) {
      result.cleanupWarning = 'Temporary diagnostic blob could not be deleted automatically.';
      result.deleteError = (await deleteResponse.text().catch(() => '')).slice(0, 300);
      return Response.json(result, { status: 502 });
    }

    result.ok = true;
    return Response.json(result);
  } catch (error) {
    result.ok = false;
    result.errorName = error instanceof Error ? error.name : 'UnknownError';
    result.error = error instanceof Error ? error.message.slice(0, 400) : 'Unknown Blob upload diagnostic error';
    result.putSucceeded = putSucceeded;
    return Response.json(result, { status: 502 });
  }
}
