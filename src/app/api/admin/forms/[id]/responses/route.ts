import { handle, json, requireAdmin, actorOf } from '@/lib/api';
import { listResponses } from '@/lib/form-builder';
export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };
/** Senior only: responses can hold personal data. Each read is audit logged. */
export const GET = handle(async (_req: Request, ctx: Ctx) => { await requireAdmin(); const s = await actorOf(); return json({ responses: await listResponses(s, (await ctx.params).id) }); });
