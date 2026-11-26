import { ApiError, handle, json, readJson } from '@/lib/api';
import { requireCaseFileAccess } from '@/lib/case-file-access';
import { KINDS, createItem, createSchema, listItems, patchItem, patchSchema, type Kind } from '@/lib/case-register';
export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };
/** Case register: enforcement, expert missions, powers of attorney, correspondence, evidence custody, money entries, checklists. */
export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params; await requireCaseFileAccess(id);
  const k = new URL(req.url).searchParams.get('kind');
  if (k && !(KINDS as readonly string[]).includes(k)) throw new ApiError(400, 'نوع غير صالح');
  return json({ items: await listItems(id, (k as Kind) || undefined) });
});
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params; const a = await requireCaseFileAccess(id);
  if (!a.canRequestChanges) throw new ApiError(403, 'لا تملك صلاحية التعديل على هذه القضية');
  const r = await createItem(a.session, id, await readJson(req, createSchema));
  if ('error' in r) return json(r, { status: 400 });
  return json(r, { status: 201 });
});
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params; const a = await requireCaseFileAccess(id);
  if (!a.canRequestChanges) throw new ApiError(403, 'لا تملك صلاحية التعديل على هذه القضية');
  const r = await patchItem(a.session, id, await readJson(req, patchSchema));
  if ('error' in r) return json(r, { status: r.error === 'not-found' ? 404 : 400 });
  return json(r);
});
