import { ApiError, actorOf, handle, json } from '@/lib/api';
import { isSeniorManagement } from '@/lib/office-workflow';
import { analytics } from '@/lib/office-analytics';
export const dynamic = 'force-dynamic';
const num = (v: string | null, d: number, lo: number, hi: number) => { const n = Number(v); return Number.isFinite(n) && v !== null && v !== '' ? Math.min(hi, Math.max(lo, Math.trunc(n))) : d; };
/** Office analytics (items 166, 167, 168, 169, 171, 189). Senior management only: it spans every branch and walled case (counts only). */
export const GET = handle(async (req: Request) => {
  const s = await actorOf(); if (!(await isSeniorManagement(s))) throw new ApiError(403, 'تقارير المكتب للإدارة العليا فقط');
  const sp = new URL(req.url).searchParams;
  return json(await analytics({ capacity: num(sp.get('capacity'), 10, 1, 200), extra: num(sp.get('extra'), 0, 0, 500), staleDays: num(sp.get('staleDays'), 30, 1, 3650) }));
});
