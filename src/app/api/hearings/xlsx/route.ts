import { NextResponse } from 'next/server';
import { ApiError, actorOf, handle } from '@/lib/api';
import { sessionsOfLawyer, toXlsx } from '@/lib/hearings';
import { logAuditEvent } from '@/lib/audit';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
/** XLSX export of the caller's own court sessions; staff may pass lawyerId. */
export const GET = handle(async (req: Request) => {
  const s = await actorOf(); const lawyerId = s.role === 'lawyer' ? s.lawyerId : new URL(req.url).searchParams.get('lawyerId') ?? '';
  if (!lawyerId) throw new ApiError(400, 'حدد المحامي');
  const rows = await sessionsOfLawyer(lawyerId);
  await logAuditEvent({ actorUserId: s.role === 'admin' ? s.userId : null, actorLawyerId: s.role === 'lawyer' ? s.lawyerId : null, action: 'SESSIONS_XLSX_EXPORT', resourceType: 'lawyer', resourceId: lawyerId, summary: 'XLSX export', metadata: { count: rows.length } });
  const body = await toXlsx(rows);
  return new NextResponse(new Uint8Array(body), { headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'content-disposition': 'attachment; filename="sessions.xlsx"', 'cache-control': 'no-store' } });
});
