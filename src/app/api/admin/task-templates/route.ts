import { z } from 'zod';
import { ApiError, actorOf, handle, json, readJson, requirePermission } from '@/lib/api';
import { instantiateTemplate, listTemplates, saveTemplate } from '@/lib/office-ops';
export const dynamic = 'force-dynamic';
export const GET = handle(async () => { await requirePermission('writeTasks'); return json({ templates: await listTemplates() }); });
export const POST = handle(async (req: Request) => {
  await requirePermission('writeTasks'); const s = await actorOf();
  const b = await readJson(req, z.union([
    z.object({ action: z.literal('save'), name: z.string().min(1).max(120), description: z.string().min(1).max(500), notes: z.string().max(2000).optional(), checklist: z.array(z.string().min(1).max(300)).max(40) }),
    z.object({ action: z.literal('use'), templateId: z.string().min(1), locationId: z.string().min(1), caseId: z.string().nullable().optional(), scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional() }),
  ]));
  if (b.action === 'save') { await saveTemplate(s, b); return json({ ok: true }, { status: 201 }); }
  const r = await instantiateTemplate(s, b.templateId, b);
  if ('error' in r) throw new ApiError(r.error === 'no-case-access' ? 403 : 404, 'تعذر إنشاء المهمة: ' + r.error);
  return json({ ok: true, taskId: r.taskId }, { status: 201 });
});
