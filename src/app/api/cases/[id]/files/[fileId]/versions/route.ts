import { ApiError, handle, json } from '@/lib/api';
import { requireCaseFileAccess } from '@/lib/case-file-access';
import { versionChain } from '@/lib/case-file-meta';
export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string; fileId: string }> };
/** Version history of one document (item 152). Old versions stay readable and are never overwritten. */
export const GET = handle(async (_r: Request, { params }: Ctx) => {
  const { id, fileId } = await params; await requireCaseFileAccess(id);
  const v = await versionChain(id, fileId); if (!v) throw new ApiError(404, 'الملف غير موجود');
  return json({ versions: v });
});
