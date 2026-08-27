import { NextResponse } from 'next/server';
import { checkHealth } from '@/lib/health';

/** Health must always execute at request time; cached diagnostics are misleading. */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const health = await checkHealth();

  return NextResponse.json(health, {
    status: health.status === 'ok' ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
