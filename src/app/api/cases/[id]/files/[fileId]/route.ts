import { ApiError, handle, json } from '@/lib/api';
import { requireCaseFileAccess } from '@/lib/case-file-access';
import { prisma } from '@/lib/prisma';
import { createFileDeletionRequest } from '@/lib/file-deletion';

type Ctx = { params: Promise<{ id:string; fileId:string }> };

export const DELETE = handle(async (request:Request,{params}:Ctx) => {
  const {id,fileId}=await params;
  const access=await requireCaseFileAccess(id);
  if(!access.canRequestChanges) throw new ApiError(403,'لا تملك صلاحية طلب حذف مستند من هذه القضية.');
  const {session}=access;
  const body=await request.json().catch(()=>null);
  const reason=typeof body?.reason==='string'?body.reason.trim():'';
  if(reason.length<3||reason.length>1000) throw new ApiError(400,'اكتب سببًا واضحًا لطلب حذف الملف.');
  const rows=await prisma.$queryRawUnsafe<Array<{
    id:string;name:string;kind:string;mime_type:string|null;size_bytes:number|null;url:string|null;
  }>>(
    `SELECT "id","name","kind","mime_type","size_bytes","url"
     FROM "case_files" WHERE "id"=$1 AND "case_id"=$2 AND "deleted_at" IS NULL LIMIT 1`,
    fileId,id,
  );
  const file=rows[0];
  if(!file) throw new ApiError(404,'ملف القضية غير موجود أو سبق نقله إلى الأرشيف.');
  if(!file.url) throw new ApiError(400,'لا يمكن طلب حذف ملف لا يحتوي على نسخة مخزنة.');
  const result=await createFileDeletionRequest({
    session,fileType:'case',fileId,resourceId:id,fileName:file.name,fileKind:file.kind,
    mimeType:file.mime_type,sizeBytes:file.size_bytes===null?null:Number(file.size_bytes),
    storageUrl:file.url,reason,
  });
  return json({ok:true,requestId:result.id,duplicate:result.duplicate},{status:202});
});
