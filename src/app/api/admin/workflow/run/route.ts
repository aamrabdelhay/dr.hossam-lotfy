import { ApiError, actorOf, handle, json } from '@/lib/api';
import { isSeniorManagement } from '@/lib/office-workflow';
import { runWorkflow } from '@/lib/workflow-engine';
export const dynamic = 'force-dynamic';
/** Manual run of the enabled workflow rules (senior only). The scheduled run is /api/cron/workflow. */
export const POST = handle(async () => { const s = await actorOf(); if (!(await isSeniorManagement(s))) throw new ApiError(403, 'للإدارة العليا فقط'); return json({ sent: await runWorkflow(new Date().toISOString().slice(0, 10)) }); });
