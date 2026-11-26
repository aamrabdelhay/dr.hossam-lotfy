import { ApiError, handle, json } from '@/lib/api';
import { requireCaseFileAccess } from '@/lib/case-file-access';
import { chronology, passport } from '@/lib/case-chronology';
export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };
/** Case passport and chronology (items 125/126). Same case wall as the case files. */
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params; await requireCaseFileAccess(id);
  const p = await passport(id); if (!p) throw new ApiError(404, 'القضية غير موجودة');
  return json({ passport: p, events: await chronology(id) });
});
