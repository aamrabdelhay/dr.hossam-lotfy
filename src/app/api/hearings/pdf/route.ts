import { NextResponse } from 'next/server';
import { ApiError, actorOf, handle } from '@/lib/api';
import { sessionsOfLawyer, toPdf } from '@/lib/hearings';
import { logAuditEvent } from '@/lib/audit';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
/** PDF export of the caller's own court sessions; staff may pass lawyerId. */
export const GET = handle(async (req: Request) => {
  const s = await actorOf(); const lawyerId = s.role === 'lawyer' ? s.lawyerId : new URL(req.url).searchParams.get('lawyerId') ?? '';
  if (!lawyerId) throw new ApiError(400, 'حدد المحامي');
  const rows = await sessionsOfLawyer(lawyerId);
  await logAuditEvent({ actorUserId: s.role === 'admin' ? s.userId : null, actorLawyerId: s.role === 'lawyer' ? s.lawyerId : null, action: 'SESSIONS_PDF_EXPORT', resourceType: 'lawyer', resourceId: lawyerId, summary: 'PDF export', metadata: { count: rows.length } });
  const body = await toPdf(rows, "جدول الجلسات");
  return new NextResponse(new Uint8Array(body), { headers: { 'content-type': 'application/pdf', 'content-disposition': 'attachment; filename="sessions.pdf"', 'cache-control': 'no-store' } });
});
