import { NextResponse } from 'next/server';
import { ApiError, actorOf, handle } from '@/lib/api';
import { sessionsOfLawyer, toIcs } from '@/lib/hearings';
import { logAuditEvent } from '@/lib/audit';
export const dynamic = 'force-dynamic';
/** ICS export of the caller's own court sessions (staff may pass lawyerId). Audit logged. */
export const GET = handle(async (req: Request) => {
  const s = await actorOf(); const lawyerId = s.role === 'lawyer' ? s.lawyerId : new URL(req.url).searchParams.get('lawyerId') ?? '';
  if (!lawyerId) throw new ApiError(400, 'حدد المحامي');
  const rows = await sessionsOfLawyer(lawyerId);
  await logAuditEvent({ actorUserId: s.role === 'admin' ? s.userId : null, actorLawyerId: s.role === 'lawyer' ? s.lawyerId : null, action: 'SESSIONS_ICS_EXPORT', resourceType: 'lawyer', resourceId: lawyerId, summary: 'ICS export', metadata: { count: rows.length } });
  return new NextResponse(toIcs(rows), { headers: { 'content-type': 'text/calendar; charset=utf-8', 'content-disposition': 'attachment; filename="sessions.ics"', 'cache-control': 'no-store' } });
});
