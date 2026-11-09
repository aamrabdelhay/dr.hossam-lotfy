import { ApiError, handle, json, user, requirePermission } from '@/lib/api';
import { requireClientFileAccess } from '@/lib/client-file-access';
import { prisma } from '@/lib/prisma';
import { createFileDeletionRequest } from '@/lib/file-deletion';

type Ctx = { params: Promise<{ id:string; fileId:string }> };

export const DELETE = handle(async (request:Request,{params}:Ctx) => {
  const {id,fileId}=await params;
  await requirePermission('writeTasks');
  await requireClientFileAccess(id);
  const session=await user();
  if(!session) throw new ApiError(401,'يجب تسجيل الدخول.');
  const body=await request.json().catch(()=>null);
  const reason=typeof body?.reason==='string'?body.reason.trim():'';
  if(reason.length<3||reason.length>1000) throw new ApiError(400,'اكتب سببًا واضحًا لطلب حذف الملف.');
  const rows=await prisma.$queryRawUnsafe<Array<{
    id:string;name:string;kind:string;mime_type:string|null;size_bytes:number|null;url:string|null;text_content:string|null;
  }>>(
    `SELECT "id","name","kind","mime_type","size_bytes","url","text_content"
     FROM "client_files" WHERE "id"=$1 AND "client_id"=$2 AND "deleted_at" IS NULL LIMIT 1`,
    fileId,id,
  );
  const file=rows[0];
  if(!file) throw new ApiError(404,'ملف العميل غير موجود أو سبق نقله إلى الأرشيف.');
  if(!file.url) throw new ApiError(400,'لا يمكن طلب حذف ملف لا يحتوي على نسخة مخزنة.');
  const result=await createFileDeletionRequest({
    session,fileType:'client',fileId,resourceId:id,fileName:file.name,fileKind:file.kind,
    mimeType:file.mime_type,sizeBytes:file.size_bytes===null?null:Number(file.size_bytes),
    storageUrl:file.url,textContent:file.text_content,reason,
  });
  return json({ok:true,requestId:result.id,duplicate:result.duplicate},{status:202});
});
