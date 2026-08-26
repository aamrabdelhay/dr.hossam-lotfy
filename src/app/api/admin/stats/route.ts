import { getAdminStats } from '@/lib/queries';
import { handle, json, requireAdmin } from '@/lib/api';

export const GET = handle(async (_req: Request) => {
  await requireAdmin();
  const stats = await getAdminStats();
  return json({ stats });
});
