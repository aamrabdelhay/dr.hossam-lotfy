import { actorOf, handle, json, requirePermission } from '@/lib/api';
import { dataQualityReport } from '@/lib/data-tools';
import { branchFilter } from '@/lib/office-ops';
export const dynamic = 'force-dynamic';
export const GET = handle(async () => {
  await requirePermission('viewAdmin');
  const actor = await actorOf();
  return json(await dataQualityReport(actor, await branchFilter(actor)));
});
