import crypto from 'node:crypto';
import { get } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPrivateS3Object, getPrivateS3ObjectForPrefix, parsePrivateS3Url, parsePrivateS3UrlForPrefix } from '@/lib/client-file-s3';
import { isPrivateBlobUrl } from '@/lib/client-file-access';
import { logAuditEvent } from '@/lib/audit';

type Ctx={params:Promise<{token:string}>};
function safeHeaderFilename(name:string){return name.replace(/[\r\n"\\]/g,'_').replace(/[^\x20-\x7E]/g,'_').slice(0,150)||'shared-file';}
function encodeFilename(name:string){return encodeURIComponent(name).replace(/[!'()*]/g,(char)=>'%'+char.charCodeAt(0).toString(16).toUpperCase());}

export const dynamic='force-dynamic';
export const GET=async(_request:Request,context:Ctx)=>{
  const {token}=await context.params;
  if(!token||!/^[A-Za-z0-9_-]{40,60}$/.test(token))return NextResponse.json({error:'رابط المشاركة غير صالح أو منتهي'},{status:404});
  const tokenHash=crypto.createHash('sha256').update(token).digest('hex');
  const claimed=await prisma.$queryRawUnsafe<Array<{
    id:string;file_type:'case'|'client';file_id:string;resource_id:string;file_name:string;mime_type:string|null;storage_url:string;
    created_by_user_id:string|null;created_by_lawyer_id:string|null;download_count:number;max_downloads:number;
  }>>(
    `UPDATE "office_secure_file_links"
        SET "download_count"="download_count"+1,"last_accessed_at"=NOW()
      WHERE "token_hash"=$1 AND "revoked_at" IS NULL AND "expires_at">NOW()
        AND "download_count"<"max_downloads"
      RETURNING "id","file_type","file_id","resource_id","file_name","mime_type","storage_url",
                "created_by_user_id","created_by_lawyer_id","download_count","max_downloads"`,
    tokenHash,
  );
  const link=claimed[0];
  if(!link)return NextResponse.json({error:'رابط المشاركة غير صالح أو انتهت صلاحيته أو استُنفدت مرات التحميل'},{status:404});

  try{
    let current:Array<{name:string;mime_type:string|null;url:string|null}>=[];
    if(link.file_type==='case'){
      current=await prisma.$queryRawUnsafe<Array<{name:string;mime_type:string|null;url:string|null}>>(
        `SELECT "name","mime_type","url" FROM "case_files"
          WHERE "id"=$1 AND "case_id"=$2 AND "deleted_at" IS NULL LIMIT 1`,
        link.file_id,link.resource_id,
      );
    }else{
      current=await prisma.$queryRawUnsafe<Array<{name:string;mime_type:string|null;url:string|null}>>(
        `SELECT "name","mime_type","url" FROM "client_files"
          WHERE "id"=$1 AND "client_id"=$2 AND "deleted_at" IS NULL LIMIT 1`,
        link.file_id,link.resource_id,
      );
    }
    const file=current[0];
    if(!file?.url||file.url!==link.storage_url){
      await logAuditEvent({action:'SECURE_FILE_LINK_STALE',resourceType:link.file_type+'_file',resourceId:link.file_id,summary:'تم رفض رابط مشاركة لأن الملف الأصلي لم يعد متاحًا'});
      return NextResponse.json({error:'الملف لم يعد متاحًا للمشاركة'},{status:404});
    }

    let stream:ReadableStream<Uint8Array>|null=null;
    let contentLength:number|null=null;
    if(link.file_type==='case'){
      const prefix='cases/'+link.resource_id+'/';
      if(!parsePrivateS3UrlForPrefix(file.url,prefix))return NextResponse.json({error:'ملف المشاركة غير صالح'},{status:404});
      const object=await getPrivateS3ObjectForPrefix(file.url,prefix);
      if(!object?.Body)return NextResponse.json({error:'الملف غير موجود في التخزين'},{status:404});
      stream=object.Body.transformToWebStream() as ReadableStream<Uint8Array>;
      contentLength=object.ContentLength??null;
    }else{
      const s3=parsePrivateS3Url(file.url,link.resource_id);
      if(s3){
        const object=await getPrivateS3Object(file.url,link.resource_id);
        if(!object?.Body)return NextResponse.json({error:'الملف غير موجود في التخزين'},{status:404});
        stream=object.Body.transformToWebStream() as ReadableStream<Uint8Array>;
        contentLength=object.ContentLength??null;
      }else if(isPrivateBlobUrl(file.url,link.resource_id)){
        const blob=await get(file.url,{access:'private'});
        if(!blob||blob.statusCode!==200||!blob.stream)return NextResponse.json({error:'الملف غير موجود في التخزين'},{status:404});
        stream=blob.stream;
      }else{
        return NextResponse.json({error:'ملف المشاركة غير صالح'},{status:404});
      }
    }

    await logAuditEvent({
      action:'SECURE_FILE_LINK_ACCESSED',resourceType:link.file_type+'_file',resourceId:link.file_id,
      summary:'تم استخدام رابط مشاركة مؤقت لملف: '+file.name,
      metadata:{linkId:link.id,downloadCount:link.download_count,maxDownloads:link.max_downloads,createdByUserId:link.created_by_user_id,createdByLawyerId:link.created_by_lawyer_id},
    });
    const headers:Record<string,string>={
      'Content-Type':'application/octet-stream',
      'Content-Disposition':'attachment; filename="'+safeHeaderFilename(file.name)+'"; filename*=UTF-8\'\''+encodeFilename(file.name),
      'Cache-Control':'private, no-store, max-age=0',
      'X-Content-Type-Options':'nosniff',
      'Referrer-Policy':'no-referrer',
      'Cross-Origin-Resource-Policy':'same-origin',
    };
    if(contentLength!==null)headers['Content-Length']=String(contentLength);
    return new NextResponse(stream,{status:200,headers});
  }catch(error){
    console.error('[secure-file-share] Failed to serve shared private file:',error);
    return NextResponse.json({error:'تعذر فتح الملف من مخزن الملفات'},{status:502});
  }
};
