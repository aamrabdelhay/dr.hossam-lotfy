import { NextResponse } from 'next/server';
import { ApiError, handle, json, user } from '@/lib/api';
import { isSeniorManagement } from '@/lib/office-workflow';
import { prisma } from '@/lib/prisma';
import { get } from '@vercel/blob';
import { isPrivateBlobUrl } from '@/lib/client-file-access';
import { getPrivateS3Object, getPrivateS3ObjectForPrefix, parsePrivateS3Url } from '@/lib/client-file-s3';

type Ctx={params:Promise<{archiveId:string}>};
type Row={file_type:'client'|'case';resource_id:string;file_name:string;mime_type:string|null;storage_url:string;archive_expires_at:Date|null;status:string};
function safeHeaderFilename(name:string){return name.replace(/[\r\n"\\]/g,'_').replace(/[^\x20-\x7E]/g,'_').slice(0,150)||'archived-file';}
function encodeFilename(name:string){return encodeURIComponent(name).replace(/[!'()*]/g,(char)=>'%'+char.charCodeAt(0).toString(16).toUpperCase());}
const INLINE_TYPES=new Set(['application/pdf','image/png','image/jpeg','image/webp','video/mp4','video/webm','audio/mpeg','audio/wav','audio/ogg']);

export const GET=handle(async(request:Request,{params}:Ctx)=>{
  const session=await user();
  if(!session||!(await isSeniorManagement(session))) throw new ApiError(403,'الوصول إلى الملفات المحذوفة متاح للإدارة العليا فقط.');
  const {archiveId}=await params;
  const rows=await prisma.$queryRawUnsafe<Row[]>(
    `SELECT "file_type","resource_id","file_name","mime_type","storage_url","archive_expires_at","status"
     FROM "office_file_deletion_requests"
     WHERE "archive_id"=$1 AND "status"='APPROVED' AND "archive_expires_at">NOW()
     LIMIT 1`,archiveId,
  );
  const file=rows[0];
  if(!file) return json({error:'انتهت مدة الأرشفة أو الملف غير موجود.'},{status:404});
  let stream:ReadableStream<Uint8Array>|null=null;
  let contentType=file.mime_type||'application/octet-stream';
  let contentLength:number|null=null;
  let contentRange:string|null=null;
  let supportsRanges=false;
  const range=request.headers.get('range')||undefined;
  try{
    if(file.file_type==='case'){
      const object=await getPrivateS3ObjectForPrefix(file.storage_url,'cases/'+file.resource_id+'/',range);
      if(!object?.Body) return json({error:'الملف غير موجود في التخزين.'},{status:404});
      stream=object.Body.transformToWebStream() as ReadableStream<Uint8Array>;
      contentType=object.ContentType||contentType;contentLength=object.ContentLength??null;contentRange=object.ContentRange||null;supportsRanges=true;
    }else{
      const s3Object=parsePrivateS3Url(file.storage_url,file.resource_id);
      if(s3Object){
        const object=await getPrivateS3Object(file.storage_url,file.resource_id,range);
        if(!object?.Body) return json({error:'الملف غير موجود في التخزين.'},{status:404});
        stream=object.Body.transformToWebStream() as ReadableStream<Uint8Array>;
        contentType=object.ContentType||contentType;contentLength=object.ContentLength??null;contentRange=object.ContentRange||null;supportsRanges=true;
      }else if(isPrivateBlobUrl(file.storage_url,file.resource_id)){
        const blob=await get(file.storage_url,{access:'private'});
        if(!blob||blob.statusCode!==200||!blob.stream)return json({error:'الملف غير موجود في التخزين.'},{status:404});
        stream=blob.stream;contentType=blob.blob.contentType||contentType;
      }else return json({error:'رابط التخزين الخاص غير صالح.'},{status:404});
    }
  }catch(error){
    console.error('[file-deletion-archive] Failed to read file:',error);
    return json({error:'تعذر فتح الملف المحفوظ في الأرشيف.'},{status:502});
  }
  contentType=contentType.split(';',1)[0].trim().toLowerCase();
  const canInline=INLINE_TYPES.has(contentType);
  const forceDownload=new URL(request.url).searchParams.get('download')==='1';
  const headers:Record<string,string>={
    'Content-Type':canInline?contentType:'application/octet-stream',
    'Content-Disposition':(forceDownload||!canInline?'attachment':'inline')+'; filename="'+safeHeaderFilename(file.file_name)+'"; filename*=UTF-8\'\''+encodeFilename(file.file_name),
    'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',
  };
  if(supportsRanges)headers['Accept-Ranges']='bytes';
  if(contentLength!==null)headers['Content-Length']=String(contentLength);
  if(contentRange)headers['Content-Range']=contentRange;
  return new NextResponse(stream,{status:contentRange?206:200,headers});
});
