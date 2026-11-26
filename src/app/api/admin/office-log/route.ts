import { actorOf, handle, json, readJson } from '@/lib/api';
import { addLog, createSchema, listLog, patchSchema, setStatus } from '@/lib/office-log';
export const dynamic = 'force-dynamic';
/** Office log: meeting minutes (177), decisions (178), visitors (183), incidents (188). No delete. */
export const GET = handle(async (req: Request) => json({ entries: await listLog(await actorOf(), new URL(req.url).searchParams.get('kind') ?? undefined) }));
export const POST = handle(async (req: Request) => { const s = await actorOf(); return json(await addLog(s, await readJson(req, createSchema)), { status: 201 }); });
export const PATCH = handle(async (req: Request) => { const s = await actorOf(); return json(await setStatus(s, await readJson(req, patchSchema))); });
