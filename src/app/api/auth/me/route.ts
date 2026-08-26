import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const u = await getCurrentUser().catch(() => null);
  return NextResponse.json({ user: u });
}
