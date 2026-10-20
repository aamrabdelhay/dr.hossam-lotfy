import { del, issueSignedToken, presignUrl } from '@vercel/blob';
import { randomUUID } from 'node:crypto';

export async function POST(request: Request) {
  if (process.env.VERCEL_ENV !== 'preview') return new Response(null, { status: 404 });
  if (request.headers.get('x-upload-diagnostic-key') !== 'preview-sdk-repro-only-20261020') {
    return new Response(null, { status: 404 });
  }
  const input = await request.json().catch(() => null) as { pathname?: unknown; action?: unknown } | null;
  const pathname = typeof input?.pathname === 'string' ? input.pathname : `diagnostics/${randomUUID()}-sdk-check.txt`;
  if (!/^diagnostics\/[a-f0-9-]{36}-sdk-check\.txt$/i.test(pathname)) {
    return Response.json({ error: 'Invalid diagnostic pathname' }, { status: 400 });
  }

  try {
    if (input?.action === 'delete') {
      await del(pathname, { access: 'private' });
      return Response.json({ ok: true, deleted: true });
    }
    const validUntil = Date.now() + 5 * 60 * 1000;
    const issued = await issueSignedToken({
      pathname,
      operations: ['put'],
      validUntil,
      allowedContentTypes: ['text/plain'],
      maximumSizeInBytes: 1024,
      abortSignal: AbortSignal.timeout(15000),
    });
    const signed = await presignUrl(issued, {
      pathname,
      operation: 'put',
      validUntil,
      allowedContentTypes: ['text/plain'],
      maximumSizeInBytes: 1024,
      addRandomSuffix: false,
      allowOverwrite: false,
      access: 'private',
    });
    return Response.json({ ok: true, presignedUrl: signed.presignedUrl });
  } catch (error) {
    console.error('[preview-sdk-upload-diagnostic] Failed', error);
    return Response.json({
      error: error instanceof Error ? error.message.slice(0, 250) : 'Unknown diagnostic error',
    }, { status: 502 });
  }
}
