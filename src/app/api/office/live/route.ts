import { ApiError, actorOf, handle } from '@/lib/api';
import { canSeeOfficeLive, getOfficeLive } from '@/lib/office-live';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const GET = handle(async () => {
  const session = await actorOf();
  if (!(await canSeeOfficeLive(session))) throw new ApiError(403, 'غير مسموح');
  const payload = await getOfficeLive(session);
  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
  });
});
