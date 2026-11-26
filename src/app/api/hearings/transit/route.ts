import { z } from 'zod';
import { handle, json, readJson, requireStaff } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
export const dynamic = 'force-dynamic';
export const GET = handle(async () => { await requireStaff(); return json({ items: await prisma.$queryRawUnsafe(`SELECT "from_location_id","to_location_id","minutes" FROM "office_transit_minutes" ORDER BY "updated_at" DESC LIMIT 500`) }); });
const schema = z.object({ fromLocationId: z.string().min(1), toLocationId: z.string().min(1), minutes: z.number().int().min(0).max(600) });
/** Management enters transit minutes between two places by hand. */
export const PUT = handle(async (req: Request) => {
  const s = await requireStaff(); const b = await readJson(req, schema);
  await prisma.$executeRawUnsafe(`INSERT INTO "office_transit_minutes" ("from_location_id","to_location_id","minutes","set_by") VALUES ($1,$2,$3,$4) ON CONFLICT ("from_location_id","to_location_id") DO UPDATE SET "minutes"=$3,"set_by"=$4,"updated_at"=NOW()`, b.fromLocationId, b.toLocationId, b.minutes, 'admin:' + s.userId);
  await logAuditEvent({ actorUserId: s.userId, action: 'TRANSIT_MINUTES_SET', resourceType: 'location', resourceId: b.fromLocationId, summary: 'Transit minutes', metadata: { to: b.toLocationId, minutes: b.minutes } });
  return json({ ok: true });
});
