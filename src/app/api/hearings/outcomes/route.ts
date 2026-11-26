import { actorOf, handle, json } from '@/lib/api';
import { OUTCOMES, unrecorded } from '@/lib/hearings';
export const dynamic = 'force-dynamic';
/** GET: preset outcomes (101) and past court sessions with no recorded outcome (107). Recording goes through the existing /api/tasks/[id]/outcome flow. */
export const GET = handle(async () => { const s = await actorOf(); return json({ presets: OUTCOMES, unrecorded: await unrecorded(s) }); });
