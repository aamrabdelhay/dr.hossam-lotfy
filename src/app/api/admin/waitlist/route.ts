import { z } from 'zod';
import { ApiError, actorOf, handle, json, readJson, requirePermission } from '@/lib/api';
import { addWaitlist, listWaitlist, setWaitlistStatus, waitlistMatches } from '@/lib/office-ops';
export const dynamic = 'force-dynamic';
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const GET = handle(async (req: Request) => {
  await requirePermission('viewAdmin'); const s = await actorOf(); const u = new URL(req.url);
  if (u.searchParams.get('matchDate')) return json({ matches: await waitlistMatches(s, day.parse(u.searchParams.get('matchDate')), u.searchParams.get('branchId') || 'branch_main'), note: 'Suggestions only. Nothing is booked or sent.' });
  return json({ entries: await listWaitlist(s) });
});
export const POST = handle(async (req: Request) => { await requirePermission('viewAdmin'); const s = await actorOf(); const r = await addWaitlist(s, await readJson(req, z.object({ clientId: z.string().min(1), fromDate: day, toDate: day, notes: z.string().max(500).optional() }))); const e = (r as { error?: string }).error; if (e) throw new ApiError(e === 'wrong-branch' ? 403 : 404, e); return json({ ok: true, id: r.id }, { status: 201 }); });
export const PATCH = handle(async (req: Request) => { await requirePermission('viewAdmin'); const s = await actorOf(); const b = await readJson(req, z.object({ id: z.string().min(1), status: z.enum(['OFFERED', 'BOOKED', 'CANCELLED']) })); if (!(await setWaitlistStatus(s, b.id, b.status))) throw new ApiError(404, 'not found'); return json({ ok: true }); });
