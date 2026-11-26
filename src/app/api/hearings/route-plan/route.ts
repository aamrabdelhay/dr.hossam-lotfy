import { ApiError, actorOf, handle, json } from '@/lib/api';
import { routePlan } from '@/lib/hearings';
export const dynamic = 'force-dynamic';
export const GET = handle(async (req: Request) => {
  const s = await actorOf(); const u = new URL(req.url); const date = u.searchParams.get('date') ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ApiError(400, 'تاريخ غير صالح');
  const lawyerId = s.role === 'lawyer' ? s.lawyerId : u.searchParams.get('lawyerId') ?? '';
  if (!lawyerId) throw new ApiError(400, 'حدد المحامي');
  return json(await routePlan(lawyerId, date));
});
