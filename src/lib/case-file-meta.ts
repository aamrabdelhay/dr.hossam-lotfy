import 'server-only';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/api';
import { z } from 'zod';

export const metaSchema = z.object({
  docType: z.string().trim().min(1).max(40).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  versionOf: z.string().min(1).max(100).optional(),
});
export const reviewSchema = z.object({ fileId: z.string().min(1), reviewStatus: z.enum(['IN_REVIEW', 'APPROVED', 'REJECTED', 'DRAFT']) });
export type Meta = z.infer<typeof metaSchema>;
const clean = (t?: string[]) => (t ? [...new Set(t.map((x) => x.trim()).filter(Boolean))] : undefined);

/** Items 150/152. The chain root is the first file of the chain; every later version points to the root and gets the next number. The target must be a live file of the SAME case. */
export async function resolveVersion(caseId: string, versionOf: string): Promise<{ root: string; no: number }> {
  const [t] = await prisma.$queryRawUnsafe<{ id: string; root: string }[]>(`SELECT "id", COALESCE("version_of","id") AS root FROM "case_files" WHERE "id"=$1 AND "case_id"=$2 AND "deleted_at" IS NULL`, versionOf, caseId);
  if (!t) throw new ApiError(404, 'الملف الأصلي غير موجود في هذه القضية');
  const [m] = await prisma.$queryRawUnsafe<{ n: number }[]>(`SELECT COALESCE(max("version_no"),1)::int AS n FROM "case_files" WHERE "id"=$1 OR "version_of"=$1`, t.root);
  return { root: t.root, no: m.n + 1 };
}
/** Write type, tags and version link of an existing file row. A file that already has later versions or is already a version cannot be re-linked. */
export async function applyMeta(caseId: string, fileId: string, m: Meta) {
  const [f] = await prisma.$queryRawUnsafe<{ id: string; version_of: string | null }[]>(`SELECT "id","version_of" FROM "case_files" WHERE "id"=$1 AND "case_id"=$2 AND "deleted_at" IS NULL`, fileId, caseId);
  if (!f) throw new ApiError(404, 'الملف غير موجود');
  if (m.versionOf) {
    if (m.versionOf === fileId) throw new ApiError(400, 'لا يمكن جعل الملف نسخة من نفسه');
    if (f.version_of) throw new ApiError(409, 'الملف مسجل بالفعل كإصدار');
    const [kids] = await prisma.$queryRawUnsafe<{ c: number }[]>(`SELECT count(*)::int AS c FROM "case_files" WHERE "version_of"=$1`, fileId);
    if (kids.c > 0) throw new ApiError(409, 'للملف إصدارات لاحقة بالفعل');
    const v = await resolveVersion(caseId, m.versionOf);
    await prisma.$executeRawUnsafe(`UPDATE "case_files" SET "version_of"=$1,"version_no"=$2 WHERE "id"=$3`, v.root, v.no, fileId);
  }
  if (m.docType !== undefined) await prisma.$executeRawUnsafe(`UPDATE "case_files" SET "doc_type"=$1 WHERE "id"=$2`, m.docType, fileId);
  const tags = clean(m.tags); if (tags) await prisma.$executeRawUnsafe(`UPDATE "case_files" SET "tags"=$1::text[] WHERE "id"=$2`, tags, fileId);
}
export async function versionChain(caseId: string, fileId: string) {
  const [f] = await prisma.$queryRawUnsafe<{ root: string }[]>(`SELECT COALESCE("version_of","id") AS root FROM "case_files" WHERE "id"=$1 AND "case_id"=$2`, fileId, caseId);
  if (!f) return null;
  return prisma.$queryRawUnsafe<{ id: string; name: string; version_no: number; created_at: Date; deleted_at: Date | null }[]>(
    `SELECT "id","name","version_no","created_at","deleted_at" FROM "case_files" WHERE "case_id"=$2 AND ("id"=$1 OR "version_of"=$1) ORDER BY "version_no"`, f.root, caseId);
}

/** Item 158. Anyone who can edit the case may send a document to review (or back to draft). Only senior management approves or rejects, and the reviewer and time are stored. Editing the type or version of an approved file does not change its status, but a new version starts as DRAFT. */
export async function setReview(caseId: string, fileId: string, status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED', senior: boolean, reviewer: string) {
  if ((status === 'APPROVED' || status === 'REJECTED') && !senior) throw new ApiError(403, 'اعتماد المستند أو رفضه للإدارة العليا فقط');
  const n = await prisma.$executeRawUnsafe(`UPDATE "case_files" SET "review_status"=$1, "reviewed_by"=$2, "reviewed_at"=NOW() WHERE "id"=$3 AND "case_id"=$4 AND "deleted_at" IS NULL`, status, reviewer, fileId, caseId);
  if (!n) throw new ApiError(404, 'الملف غير موجود');
}
