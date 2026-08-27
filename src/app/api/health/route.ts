import { NextResponse } from 'next/server';
import { checkHealth } from '@/lib/health';
import { user } from '@/lib/api';

/** Health must always execute at request time; cached diagnostics are misleading. */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const health = await checkHealth();
  const currentUser = await user();
  const isAdmin = currentUser?.role === 'admin';

  // Keep operational diagnostics (schema state, migration names and record
  // counts) out of the public endpoint. Monitoring only needs a coarse health
  // signal; authenticated administrators can still inspect the full report.
  const response = isAdmin
    ? health
    : {
        status: health.status,
        ...(health.status !== 'ok' ? { error: 'الخدمة غير متاحة مؤقتاً' } : {}),
      };

  return NextResponse.json(response, {
    status: health.status === 'ok' ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
