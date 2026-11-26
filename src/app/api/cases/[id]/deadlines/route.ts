import { ApiError, handle, json, readJson } from '@/lib/api';
import { requireCaseFileAccess } from '@/lib/case-file-access';
import { addDeadline, deadlineSchema, listDeadlines, NOTICE, setDeadlineStatus, statusSchema } from '@/lib/deadlines';
export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };
/** Case deadline map (item 114): deadlines a person calculated from a recorded rule. Same case wall as the case files. Nothing is added automatically. */
export const GET = handle(async (_req: Request, ctx: Ctx) => { const { id } = await ctx.params; await requireCaseFileAccess(id); return json({ deadlines: await listDeadlines(id), notice: NOTICE }); });
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params; const a = await requireCaseFileAccess(id);
  if (!a.canRequestChanges) throw new ApiError(403, 'لا تملك صلاحية التعديل على هذه القضية');
  const r = await addDeadline(a.session, id, await readJson(req, deadlineSchema));
  if ('error' in r) return json(r, { status: 400 }); return json(r, { status: 201 });
});
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params; const a = await requireCaseFileAccess(id);
  if (!a.canRequestChanges) throw new ApiError(403, 'لا تملك صلاحية التعديل على هذه القضية');
  const r = await setDeadlineStatus(a.session, id, await readJson(req, statusSchema));
  if ('error' in r) return json(r, { status: 404 }); return json(r);
});
