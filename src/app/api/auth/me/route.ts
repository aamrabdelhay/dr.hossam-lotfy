import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const u = await getCurrentUser().catch(() => null);
  return NextResponse.json(
    { user: u },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  );
}
