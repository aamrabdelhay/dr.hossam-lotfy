import { ApiError, handle, json, readJson } from '@/lib/api';
import { requireCaseFileAccess } from '@/lib/case-file-access';
import { createItem } from '@/lib/case-register';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };
const body = z.object({ playbookId: z.string().min(1) });
/** Apply a playbook to a case (item 142): one CHECKLIST register item per step, in order. Same case wall and edit right as the register. A person still does and ticks each step. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params; const a = await requireCaseFileAccess(id);
  if (!a.canRequestChanges) throw new ApiError(403, 'لا تملك صلاحية التعديل على هذه القضية');
  const { playbookId } = await readJson(req, body);
  const [p] = await prisma.$queryRawUnsafe<{ title: string; steps: string[] }[]>(`SELECT "title","steps" FROM "office_playbooks" WHERE "id"=$1 AND "active"`, playbookId);
  if (!p) throw new ApiError(404, 'دليل الإجراءات غير موجود');
  let n = 0; for (const step of p.steps) { const r = await createItem(a.session, id, { kind: 'CHECKLIST', title: step, data: { phase: p.title } }); if ('ok' in r) n++; }
  return json({ created: n }, { status: 201 });
});
