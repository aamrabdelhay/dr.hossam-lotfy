import { getAdminStats } from '@/lib/queries';
import { handle, json, requireStaff } from '@/lib/api';

export const GET = handle(async (_req: Request) => {
  await requireStaff();
  const stats = await getAdminStats();
  return json({ stats });
});
