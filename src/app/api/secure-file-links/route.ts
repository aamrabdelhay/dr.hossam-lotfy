import crypto from 'node:crypto';
import { z } from 'zod';
import { ApiError, handle, json, readJson, user } from '@/lib/api';
import { requireCaseFileAccess } from '@/lib/case-file-access';
import { requireClientFileAccess, isPrivateBlobUrl } from '@/lib/client-file-access';
import { parsePrivateS3Url, parsePrivateS3UrlForPrefix } from '@/lib/client-file-s3';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';
const schema = z.object({
  resourceType: z.enum(['case','client']),
  resourceId: z.string().min(1).max(128),
  fileId: z.string().min(1).max(128),
  expiresInMinutes: z.union([z.literal(15),z.literal(60),z.literal(1440),z.literal(10080)]).default(60),
  maxDownloads: z.number().int().min(1).max(10).default(1),
});
const safeOrigin = () => {
  const value = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://dr-hossam-lotfy-hw88.vercel.app';
  try { return new URL(value).origin; } catch { return 'https://dr-hossam-lotfy-hw88.vercel.app'; }
};
export const POST = handle(async (request: Request) => {
  const session = await user();
  if (!session) throw new ApiError(401,'يجب تسجيل الدخول لإنشاء رابط مشاركة');
  const input = await readJson(request,schema);
  let storageUrl = '';
  let fileName = '';
  let mimeType: string | null = null;

  if (input.resourceType === 'case') {
    const access = await requireCaseFileAccess(input.resourceId);
    if (!access.canRequestChanges) throw new ApiError(403,'لا تملك صلاحية مشاركة ملفات هذه القضية');
    const rows = await prisma.$queryRawUnsafe<Array<{name:string;mime_type:string|null;url:string|null}>>(
      `SELECT "name","mime_type","url" FROM "case_files"
        WHERE "id"=$1 AND "case_id"=$2 AND "deleted_at" IS NULL LIMIT 1`,
      input.fileId,input.resourceId,
    );
    const file = rows[0];
    if (!file?.url || !parsePrivateS3UrlForPrefix(file.url,`cases/${input.resourceId}/`)) {
      throw new ApiError(404,'ملف القضية غير موجود في التخزين الخاص');
    }
    storageUrl = file.url; fileName = file.name; mimeType = file.mime_type;
  } else {
    await requireClientFileAccess(input.resourceId);
    const rows = await prisma.$queryRawUnsafe<Array<{name:string;mime_type:string|null;url:string|null}>>(
      `SELECT "name","mime_type","url" FROM "client_files"
        WHERE "id"=$1 AND "client_id"=$2 AND "deleted_at" IS NULL LIMIT 1`,
      input.fileId,input.resourceId,
    );
    const file = rows[0];
    const privateStorage = file?.url && (parsePrivateS3Url(file.url,input.resourceId) || isPrivateBlobUrl(file.url,input.resourceId));
    if (!file?.url || !privateStorage) throw new ApiError(404,'ملف العميل غير موجود في التخزين الخاص');
    storageUrl = file.url; fileName = file.name; mimeType = file.mime_type;
  }

  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now()+input.expiresInMinutes*60*1000);
  const id = 'share_' + crypto.randomUUID().replaceAll('-','');
  await prisma.$executeRawUnsafe(
    `INSERT INTO "office_secure_file_links"
      ("id","token_hash","file_type","file_id","resource_id","file_name","mime_type","storage_url",
       "created_by_user_id","created_by_lawyer_id","expires_at","max_downloads")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    id,tokenHash,input.resourceType,input.fileId,input.resourceId,fileName,mimeType,storageUrl,
    session.role==='admin'?session.userId:null,session.role==='lawyer'?session.lawyerId:null,
    expiresAt,input.maxDownloads,
  );
  await logAuditEvent({
    actorUserId:session.role==='admin'?session.userId:null,
    actorLawyerId:session.role==='lawyer'?session.lawyerId:null,
    action:'SECURE_FILE_LINK_CREATED',resourceType:input.resourceType+'_file',
    resourceId:input.fileId,summary:'تم إنشاء رابط مشاركة مؤقت لملف: '+fileName,
    metadata:{linkId:id,expiresAt:expiresAt.toISOString(),maxDownloads:input.maxDownloads},
  });
  return json({
    ok:true,
    url:safeOrigin()+'/api/public/file-share/'+token,
    expiresAt:expiresAt.toISOString(),
    maxDownloads:input.maxDownloads,
  },{status:201,headers:{'Cache-Control':'private, no-store'}});
});
