import { ApiError, actorOf, handle, json } from '@/lib/api';
import { findConflicts } from '@/lib/hearings';
export const dynamic = 'force-dynamic';
/** Overlapping court sessions for one lawyer on one date. A lawyer sees only their own; staff may pass lawyerId. */
export const GET = handle(async (req: Request) => {
  const s = await actorOf(); const u = new URL(req.url); const date = u.searchParams.get('date') ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ApiError(400, 'تاريخ غير صالح');
  const lawyerId = s.role === 'lawyer' ? s.lawyerId : u.searchParams.get('lawyerId') ?? '';
  if (!lawyerId) throw new ApiError(400, 'حدد المحامي');
  return json(await findConflicts(lawyerId, date));
});
