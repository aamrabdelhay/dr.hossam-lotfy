import { z } from 'zod';
import { ApiError, handle, json, readJson, user } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { isSeniorManagement, officeId } from '@/lib/office-workflow';

export const dynamic = 'force-dynamic';

type RequestRow = {
  id:string;file_type:'client'|'case';file_id:string;resource_id:string;
  file_name:string;file_kind:string;mime_type:string|null;size_bytes:bigint|null;
  storage_url:string;text_content:string|null;reason:string;
  requested_by_user_id:string|null;requested_by_lawyer_id:string|null;
  requested_at:Date;status:string;decided_by_user_id:string|null;
  decided_by_lawyer_id:string|null;decided_at:Date|null;decision_note:string|null;
  archive_id:string|null;archive_expires_at:Date|null;
};
type RequestListRow = {
  id:string;file_type:'client'|'case';file_name:string;file_kind:string;
  size_bytes:bigint|null;reason:string;requested_at:Date;status:string;
  requested_by_name:string;resource_name:string|null;decided_at:Date|null;
  archive_id:string|null;archive_expires_at:Date|null;
};

export const GET = handle(async () => {
  const session=await user();
  if(!session||!(await isSeniorManagement(session))) throw new ApiError(403,'عرض طلبات حذف الملفات متاح للإدارة العليا فقط.');
  const rows=await prisma.$queryRawUnsafe<RequestListRow[]>(
    `SELECT r."id",r."file_type",r."file_name",r."file_kind",r."size_bytes",
       r."reason",r."requested_at",r."status",r."decided_at",r."archive_id",r."archive_expires_at",
       COALESCE(u."name",l."fullName",'حساب غير معروف') AS "requested_by_name",
       CASE WHEN r."file_type"='case'
         THEN COALESCE(cr."name" || CASE WHEN cr."number" IS NOT NULL AND cr."number"<>'' THEN ' — '||cr."number" ELSE '' END,'قضية')
         ELSE COALESCE(c."name",'عميل') END AS "resource_name"
     FROM "office_file_deletion_requests" r
     LEFT JOIN "users" u ON u."id"=r."requested_by_user_id"
     LEFT JOIN "lawyers" l ON l."id"=r."requested_by_lawyer_id"
     LEFT JOIN "case_records" cr ON r."file_type"='case' AND cr."id"=r."resource_id"
     LEFT JOIN "clients" c ON r."file_type"='client' AND c."id"=r."resource_id"
     WHERE r."status" IN ('PENDING','APPROVED')
     ORDER BY CASE WHEN r."status"='PENDING' THEN 0 ELSE 1 END,r."requested_at" DESC
     LIMIT 500`,
  );
  const safe=(x:RequestListRow)=>({
    ...x,size_bytes:x.size_bytes===null?null:Number(x.size_bytes),
    archive_url:x.archive_id?'/api/admin/file-archives/'+encodeURIComponent(x.archive_id)+'/content':null,
  });
  const pending=rows.filter(x=>x.status==='PENDING').map(safe);
  const archives=rows.filter(x=>x.status==='APPROVED'&&x.archive_expires_at&&new Date(x.archive_expires_at)>new Date()).map(safe);
  return json({pending,archives},{headers:{'Cache-Control':'private, no-store, max-age=0'}});
});

const schema=z.object({id:z.string().min(1),action:z.enum(['approve','reject','restore']),decisionNote:z.string().max(1000).optional()});

export const POST = handle(async (request:Request) => {
  const session=await user();
  if(!session||!(await isSeniorManagement(session))) throw new ApiError(403,'اتخاذ قرار حذف الملفات متاح للإدارة العليا فقط.');
  const data=await readJson(request,schema);
  const actorUserId=session.role==='admin'?session.userId:null;
  const actorLawyerId=session.role==='lawyer'?session.lawyerId:null;
  if(data.action!=='restore'){
    const requester=await prisma.$queryRawUnsafe<Array<{requested_by_user_id:string|null;requested_by_lawyer_id:string|null}>>(
      `SELECT "requested_by_user_id","requested_by_lawyer_id" FROM "office_file_deletion_requests" WHERE "id"=$1 LIMIT 1`,data.id,
    );
    if(!requester[0]) throw new ApiError(404,'طلب حذف الملف غير موجود.');
    if((actorUserId&&requester[0].requested_by_user_id===actorUserId)||(actorLawyerId&&requester[0].requested_by_lawyer_id===actorLawyerId)){
      throw new ApiError(403,'لا يمكن اعتماد طلب حذف الملف الذي قدمته بنفسك.');
    }
  }
  const result=await prisma.$transaction(async(tx)=>{
    const rows=await tx.$queryRawUnsafe<RequestRow[]>(
      `SELECT * FROM "office_file_deletion_requests" WHERE "id"=$1 FOR UPDATE`,data.id,
    );
    const item=rows[0];
    if(!item) throw new ApiError(404,'طلب حذف الملف غير موجود.');
    if(data.action==='reject'){
      if(item.status!=='PENDING') throw new ApiError(409,'تم اتخاذ قرار في هذا الطلب بالفعل.');
      await tx.$executeRawUnsafe(
        `UPDATE "office_file_deletion_requests"
         SET "status"='REJECTED',"decided_by_user_id"=$2,"decided_by_lawyer_id"=$3,
             "decided_at"=NOW(),"decision_note"=$4 WHERE "id"=$1`,
        item.id,actorUserId,actorLawyerId,data.decisionNote?.trim()||null,
      );
      return {status:'REJECTED',archiveId:null};
    }
    if(data.action==='approve'){
      if(item.status!=='PENDING') throw new ApiError(409,'تم اتخاذ قرار في هذا الطلب بالفعل.');
      const table=item.file_type==='case'?'case_files':'client_files';
      const ownerColumn=item.file_type==='case'?'case_id':'client_id';
      const sql='UPDATE "'+table+'" SET "deleted_at"=NOW() WHERE "id"=$1 AND "'+ownerColumn+'"=$2 AND "deleted_at" IS NULL RETURNING "id"';
      const changed=await tx.$queryRawUnsafe<Array<{id:string}>>(sql,item.file_id,item.resource_id);
      if(!changed.length) throw new ApiError(409,'الملف لم يعد متاحًا للحذف أو سبق نقله إلى الأرشيف.');
      const archiveId=officeId('archive');
      const snapshot={
        fileType:item.file_type,resourceId:item.resource_id,fileId:item.file_id,
        name:item.file_name,kind:item.file_kind,mimeType:item.mime_type,
        sizeBytes:item.size_bytes===null?null:Number(item.size_bytes),
        storageUrl:item.storage_url,textContent:item.text_content,reason:item.reason,
        requestedAt:item.requested_at,
      };
      await tx.$executeRawUnsafe(
        `INSERT INTO "office_archive"
          ("id","entity_type","entity_id","label","snapshot_json","deleted_by_user_id","deleted_by_lawyer_id","expires_at")
         VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,NOW()+INTERVAL '31 days')`,
        archiveId,item.file_type==='case'?'case_file':'client_file',item.file_id,item.file_name,
        JSON.stringify(snapshot),actorUserId,actorLawyerId,
      );
      await tx.$executeRawUnsafe(
        `UPDATE "office_file_deletion_requests"
         SET "status"='APPROVED',"decided_by_user_id"=$2,"decided_by_lawyer_id"=$3,
             "decided_at"=NOW(),"decision_note"=$4,"archive_id"=$5,
             "archive_expires_at"=NOW()+INTERVAL '31 days' WHERE "id"=$1`,
        item.id,actorUserId,actorLawyerId,data.decisionNote?.trim()||null,archiveId,
      );
      return {status:'APPROVED',archiveId};
    }
    if(item.status!=='APPROVED'||!item.archive_id) throw new ApiError(409,'لا يوجد ملف نشط في الأرشيف لاسترجاعه.');
    if(!item.archive_expires_at||new Date(item.archive_expires_at)<=new Date()) throw new ApiError(410,'انتهت مدة أرشفة الملف البالغة 31 يومًا.');
    const table=item.file_type==='case'?'case_files':'client_files';
    const ownerColumn=item.file_type==='case'?'case_id':'client_id';
    const sql='UPDATE "'+table+'" SET "deleted_at"=NULL WHERE "id"=$1 AND "'+ownerColumn+'"=$2 AND "deleted_at" IS NOT NULL';
    const restored=await tx.$executeRawUnsafe(sql,item.file_id,item.resource_id);
    if(!restored) throw new ApiError(409,'تعذر استرجاع الملف؛ قد يكون قد انتهى أو حُذف نهائيًا.');
    await tx.$executeRawUnsafe(
      `UPDATE "office_archive" SET "restored_at"=NOW(),"restored_by_user_id"=$2
       WHERE "id"=$1 AND "restored_at" IS NULL AND ("expires_at" IS NULL OR "expires_at">NOW())`,
      item.archive_id,actorUserId,
    );
    await tx.$executeRawUnsafe(
      `UPDATE "office_file_deletion_requests" SET "status"='RESTORED' WHERE "id"=$1 AND "status"='APPROVED'`,
      item.id,
    );
    return {status:'RESTORED',archiveId:item.archive_id};
  });

  if(data.action==='approve'||data.action==='reject'){
    const title=data.action==='approve'?'تمت الموافقة على طلب حذف الملف':'تم رفض طلب حذف الملف';
    const body=data.action==='approve'?'تم نقل الملف إلى الأرشيف المحمي لمدة 31 يومًا.':'تم رفض طلب الحذف، والملف لم يتغير.';
    const row=await prisma.$queryRawUnsafe<Array<{requested_by_user_id:string|null;requested_by_lawyer_id:string|null}>>(
      `SELECT "requested_by_user_id","requested_by_lawyer_id" FROM "office_file_deletion_requests" WHERE "id"=$1`,data.id,
    );
    if(row[0]) await prisma.$executeRawUnsafe(
      `INSERT INTO "notifications" ("id","userId","lawyerId","type","title","body","link","createdAt")
       VALUES ($1,$2,$3,'OFFICE_REQUEST',$4,$5,'/admin/office/control',NOW())`,
      officeId('ntf'),row[0].requested_by_user_id,row[0].requested_by_lawyer_id,title,body,
    ).catch(()=>undefined);
  }
  return json({ok:true,...result});
});
