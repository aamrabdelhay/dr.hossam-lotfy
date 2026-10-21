'use client';

import * as React from 'react';
import { X, Upload, Eye, Download, FileText, Plus, CalendarDays, Clock, Trash2 } from 'lucide-react';

type Appointment = { date: string | null; time: string | null; type: string; status: string; id?: string };
const MAX_CLIENT_FILE_BYTES = 100 * 1024 * 1024;
const CLIENT_FILE_TYPES: Record<string, { mime: string; kind: string }> = {
  '.png': { mime: 'image/png', kind: 'image' },
  '.jpg': { mime: 'image/jpeg', kind: 'image' },
  '.jpeg': { mime: 'image/jpeg', kind: 'image' },
  '.webp': { mime: 'image/webp', kind: 'image' },
  '.mp4': { mime: 'video/mp4', kind: 'video' },
  '.webm': { mime: 'video/webm', kind: 'video' },
  '.mp3': { mime: 'audio/mpeg', kind: 'audio' },
  '.wav': { mime: 'audio/wav', kind: 'audio' },
  '.ogg': { mime: 'audio/ogg', kind: 'audio' },
  '.pdf': { mime: 'application/pdf', kind: 'pdf' },
  '.doc': { mime: 'application/msword', kind: 'word' },
  '.docx': { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', kind: 'word' },
};
type FileUploadProgress = (stage: 'preparing' | 'uploading' | 'saving', percentage?: number) => void;

function safeClientFilename(name: string) {
  return name
    .replace(/[\/\\]/g, '_')
    .replace(/[^\w.\-\u0600-\u06ff ]/g, '_')
    .slice(0, 180) || 'client-file';
}
const APPOINTMENT_TYPE_LABELS: Record<string,string> = { LEGAL_CONSULTATION:'استشارة قانونية', CASE_FOLLOW_UP:'متابعة ملف', OTHER:'أخرى', 'استشارة قانونية':'استشارة قانونية', 'متابعة ملف':'متابعة ملف', 'أخرى':'أخرى' };
type Client = {
  id:string;
  name:string;
  phone:string|null;
  email:string|null;
  nationalId:string|null;
  address:string|null;
  notes:string|null;
  assignedLawyerId:string|null;
  caseCount:number;
  status?:string;
  nextAppointment?: Appointment | null;
};

export function ClientsManagementClient({
  initialClients,
  initialCases,
  lawyers,
}: {
  initialClients:Client[];
  initialCases:Array<{id:string;name:string;number:string;clientId:string|null}>;
  lawyers:Array<{id:string;name:string}>;
}) {
  const [clients,setClients]=React.useState(initialClients);
  const [files,setFiles]=React.useState<Record<string,any[]>>({});
  const [open,setOpen]=React.useState<string|null>(null);
  const [preview,setPreview]=React.useState<{name:string;url:string;kind:string;text?:string}|null>(null);
  const [name,setName]=React.useState('');
  const [typeTab,setTypeTab]=React.useState('ALL');

  const add=async()=>{
    if(!name.trim())return;
    const r=await fetch('/api/clients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name.trim()})});
    if(r.ok){
      const j=await r.json();
      setClients(x=>[...x,{...j.client,caseCount:0,status:'POTENTIAL',nextAppointment:null}]);
      setName('');
    }
  };

  const setStatus=async(id:string,status:string)=>{
    const r=await fetch(`/api/clients/${id}/status`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});
    if(r.ok)setClients(x=>x.map(c=>c.id===id?{...c,status}:c));
  };

  const deleteClient=async(id:string)=>{
    if(!window.confirm('هل تريد حذف هذا العميل؟ سيتم نقله إلى الأرشيف ويمكن استرجاعه لاحقًا.'))return;
    const r=await fetch(`/api/clients/${id}`,{method:'DELETE'});
    const j=await r.json().catch(()=>({}));
    if(r.ok)setClients(x=>x.filter(c=>c.id!==id));
    else alert(j.error||'تعذر حذف العميل');
  };

  const loadFiles=async(id:string)=>{
    if(files[id]){
      setOpen(open===id?null:id);
      return;
    }
    try{
      const r=await fetch(`/api/clients/${id}/files`);
      const j=await r.json().catch(()=>({}));
      if(!r.ok){
        alert(j.error || 'تعذر تحميل ملفات العميل. تحقق من الصلاحيات والاتصال وحاول مرة أخرى.');
        return;
      }
      setFiles(x=>({...x,[id]:j.files||[]}));
      setOpen(id);
    }catch{
      alert('تعذر الاتصال بالخادم لتحميل ملفات العميل. تحقق من الاتصال وحاول مرة أخرى.');
    }
  };

  const upload=async(id:string,mode:'file'|'link'|'note',value:any,onProgress?:FileUploadProgress):Promise<boolean>=>{
    let payload:{name:string;kind:string;url?:string|null;text?:string|null;mimeType?:string|null;size?:number};

    if(mode==='file'){
      const file=value.file as File|undefined;
      if(!file){
        alert('اختر ملفًا أولًا.');
        return false;
      }
      if(file.size<=0){
        alert('الملف فارغ.');
        return false;
      }
      if(file.size>MAX_CLIENT_FILE_BYTES){
        alert('حجم الملف أكبر من الحد المسموح به. الحد الأقصى 100 ميجابايت.');
        return false;
      }

      const extension=file.name.toLowerCase().match(/\.[^.]+$/)?.[0]||'';
      const fileType=CLIENT_FILE_TYPES[extension];
      if(!fileType){
        alert('نوع الملف غير مدعوم. استخدم صورة PNG أو JPG أو WebP أو PDF أو Word.');
        return false;
      }
      if(file.type && file.type!==fileType.mime){
        alert('نوع الملف لا يتوافق مع امتداده. اختر الملف الأصلي وحاول مرة أخرى.');
        return false;
      }

      const pathname='clients/'+id+'/'+crypto.randomUUID()+'-'+safeClientFilename(file.name);
      onProgress?.('preparing',0);
      let signed: { uploadUrl: string; fields: Record<string, string>; storedUrl: string };
      try {
        const response = await fetch('/api/clients/'+id+'/files/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pathname, contentType: fileType.mime, size: file.size }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'تعذر تجهيز رابط الرفع من Amazon S3.');
        signed = result as typeof signed;
      } catch (error) {
        console.error('[client-file-s3-upload] Could not get an Amazon S3 upload form:', error);
        throw error instanceof Error ? error : new Error('تعذر الحصول على تصريح رفع الملف من Amazon S3.');
      }
      await new Promise<void>((resolve, reject) => {
        const form = new FormData();
        for (const [key, value] of Object.entries(signed.fields)) form.append(key, value);
        form.append('file', file);
        const xhr = new XMLHttpRequest();
        xhr.open('POST', signed.uploadUrl);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) onProgress?.('uploading', Math.round((event.loaded / event.total) * 100));
        };
        xhr.onerror = () => reject(new Error('تعذر الاتصال بـ Amazon S3. تحقق من إعدادات CORS في مخزن الملفات ثم أعد المحاولة.'));
        xhr.onabort = () => reject(new Error('تم إلغاء رفع الملف.'));
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            onProgress?.('uploading',100);
            resolve();
          } else reject(new Error('رفض Amazon S3 رفع الملف (HTTP '+xhr.status+'). راجع إعدادات المخزن وحاول مرة أخرى.'));
        };
        xhr.send(form);
      });

      onProgress?.('saving',100);
      payload={
        name:file.name,
        kind:fileType.kind,
        url:signed.storedUrl,
        mimeType:fileType.mime,
        size:file.size,
      };
    }else{
      payload={
        name:value.name||'ملاحظة',
        kind:mode,
        url:value.url||null,
        text:value.text||null,
      };
    }

    onProgress?.('saving',100);
    try{
      const r=await fetch(`/api/clients/${id}/files`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload),
      });
      const j=await r.json().catch(()=>({}));
      if(!r.ok){
        alert(j.error || 'تعذر حفظ بيانات الملف في المنصة. تحقق من الصلاحيات والاتصال ثم حاول مرة أخرى.');
        return false;
      }
      const item={
        id:j.id,
        name:payload.name||'ملف جديد',
        kind:j.kind||payload.kind,
        url:j.url||payload.url||'',
        text_content:payload.text||null,
      };
      setFiles(x=>({...x,[id]:[...(x[id]||[]),item]}));
      setOpen(id);
      return true;
    }catch{
      alert('تعذر الاتصال بالخادم أثناء حفظ الملف. حاول تحديث قائمة ملفات العميل قبل إعادة الرفع.');
      return false;
    }
  };

  const appointmentType = (c: Client) => c.nextAppointment ? (APPOINTMENT_TYPE_LABELS[c.nextAppointment.type] || c.nextAppointment.type) : 'OTHER';
  const sections=[['ALL','كل طلبات المواعيد'],['LEGAL_CONSULTATION','استشارة قانونية'],['CASE_FOLLOW_UP','متابعة ملف'],['OTHER','أخرى']];
  const current=clients.filter(c=>typeTab==='ALL' || appointmentType(c)===APPOINTMENT_TYPE_LABELS[typeTab] || (typeTab==='OTHER' && appointmentType(c)==='أخرى'));


  return (
    <div dir="rtl" className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {sections.map(([id,label])=>
          <button key={id} onClick={()=>setTypeTab(id)} className={`rounded-full px-4 py-2 text-xs font-extrabold ${typeTab===id?'bg-navy-950 text-white':'border border-navy-200 bg-white text-navy-600'}`}>
            {label} ({clients.filter(c=>id==='ALL' ? !!c.nextAppointment : appointmentType(c)===APPOINTMENT_TYPE_LABELS[id]).length})
          </button>
        )}
      </div>
      <div className="flex gap-2">
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="اسم عميل جديد" className="min-w-0 flex-1 rounded-xl border border-navy-200 bg-white px-3 py-2 text-sm"/>
        <button onClick={add} className="rounded-xl bg-navy-950 px-4 py-2 text-xs font-bold text-white"><Plus size={14}/></button>
      </div>
      <div className="grid gap-3">
        {current.map(c=>
          <ClientRow
            key={c.id}
            client={c}
            files={files[c.id]||[]}
            open={open===c.id}
            onOpen={()=>void loadFiles(c.id)}
            onStatus={setStatus}
            onDelete={deleteClient}
            onPreview={setPreview}
            onUpload={upload}
          />
        )}
      </div>
      {!current.length&&<div className="rounded-2xl border border-dashed p-8 text-center text-sm text-navy-400">لا توجد عملاء في هذا القسم.</div>}
      {preview&&<FilePreview item={preview} onClose={()=>setPreview(null)}/>}
    </div>
  );
}

function ClientRow({
  client,
  files,
  open,
  onOpen,
  onStatus,
  onDelete,
  onPreview,
  onUpload,
}: {
  client:Client;
  files:any[];
  open:boolean;
  onOpen:()=>void;
  onStatus:(id:string,status:string)=>void;
  onDelete:(id:string)=>void;
  onPreview:(x:any)=>void;
  onUpload:(id:string,mode:'file'|'link'|'note',v:any,onProgress?:FileUploadProgress)=>Promise<boolean>;
}) {
  const [file,setFile]=React.useState<File|null>(null);
  const [url,setUrl]=React.useState('');
  const [text,setText]=React.useState('');
  const [showAdd,setShowAdd]=React.useState(false);
  const [schedule,setSchedule]=React.useState(false);
  const [date,setDate]=React.useState('');
  const [time,setTime]=React.useState('');

  const previewUrl=file?URL.createObjectURL(file):'';
  const [isSubmittingUpload,setIsSubmittingUpload]=React.useState(false);
  const [uploadProgress,setUploadProgress]=React.useState<{stage:'preparing'|'uploading'|'saving';percentage:number}|null>(null);
  const [uploadError,setUploadError]=React.useState('');

  const confirmUpload=async()=>{
    if(isSubmittingUpload)return;
    if(!file&&!url.trim()&&!text.trim()){
      setUploadError('اختر ملفًا أو أدخل رابطًا أو اكتب ملاحظة قبل التأكيد.');
      return;
    }

    setIsSubmittingUpload(true);
    setUploadError('');
    setUploadProgress({stage:file?'preparing':'saving',percentage:0});
    const updateProgress:FileUploadProgress=(stage,percentage)=>setUploadProgress({
      stage,
      percentage:Math.max(0,Math.min(100,percentage??0)),
    });

    try{
      let ok=false;
      if(file){
        ok=await onUpload(client.id,'file',{name:file.name,file},updateProgress);
      }else if(url.trim()){
        ok=await onUpload(client.id,'link',{name:url.trim(),url:url.trim()},updateProgress);
      }else if(text.trim()){
        ok=await onUpload(client.id,'note',{name:'ملاحظة',text:text.trim()},updateProgress);
      }

      if(!ok){
        setUploadError('تعذر إتمام العملية. راجع رسالة الخطأ ثم حاول مرة أخرى.');
        return;
      }

      setFile(null);
      setUrl('');
      setText('');
      setShowAdd(false);
    }catch(error){
      setUploadError(error instanceof Error ? `تعذر إتمام الرفع: ${error.message}` : 'تعذر إتمام الرفع. حاول مرة أخرى.');
    }finally{
      setIsSubmittingUpload(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="notranslate text-sm font-extrabold text-navy-950" translate="no">{client.name}</div>
          <div className="mt-1 text-[11px] text-navy-400">{client.phone||'—'} • {client.email||'—'} • {client.caseCount} قضية</div>
          {client.nextAppointment&&(
            <div className="mt-2 rounded-xl border border-gold-200 bg-gold-50/50 p-3 text-[11px] font-bold text-navy-700">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1.5 text-gold-700"><CalendarDays size={13}/>طلب موعد</span>
                <span className="text-navy-500">{APPOINTMENT_TYPE_LABELS[client.nextAppointment.type] || client.nextAppointment.type}</span>
                {client.nextAppointment.date && <span>{client.nextAppointment.date}</span>}
                {client.nextAppointment.time && <span className="inline-flex items-center gap-1"><Clock size={12}/>{client.nextAppointment.time}</span>}
                {!client.nextAppointment.date && <span className="text-amber-700">بانتظار تحديد الموعد</span>}
              </div>
              {!client.nextAppointment.date && (
                <button onClick={()=>setSchedule(true)} className="mt-2 rounded-lg bg-navy-950 px-3 py-2 text-[10px] font-extrabold text-white">تحديد الموعد</button>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-navy-50 px-2.5 py-1 text-[10px] font-extrabold text-navy-600">
            {client.status==='MAIN'?'عميل':client.status==='FOLLOW_UP'?'تحت المتابعة':'عميل محتمل'}
          </span>
          <button onClick={()=>onStatus(client.id,'POTENTIAL')} title="تصنيف كعميل محتمل" className={`rounded-lg p-2 ${client.status==='POTENTIAL'?'bg-gold-50 text-gold-700':'border text-navy-500'}`}>محتمل</button>
          <button onClick={()=>onStatus(client.id,'MAIN')} title="تصنيف كعميل" className={`rounded-lg p-2 ${client.status==='MAIN'?'bg-emerald-50 text-emerald-700':'border text-navy-500'}`}>عميل</button>
          <button onClick={()=>onStatus(client.id,'FOLLOW_UP')} title="وضع تحت المتابعة" className={`rounded-lg p-2 ${client.status==='FOLLOW_UP'?'bg-amber-50 text-amber-700':'border text-navy-500'}`}>متابعة</button>
          <button onClick={onOpen} className="rounded-lg border p-2 text-navy-600" title="ملفات العميل"><FileText size={15}/></button>
          <button onClick={()=>void onDelete(client.id)} title="حذف ونقل إلى الأرشيف" className="rounded-lg border border-red-200 p-2 text-red-600"><Trash2 size={15}/></button>
        </div>
      </div>

      {schedule&&client.nextAppointment&&(
        <div className="mt-3 rounded-xl border border-navy-100 bg-ivory-50 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs font-bold">التاريخ<input type="date" value={date} onChange={e=>setDate(e.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2"/></label>
            <label className="text-xs font-bold">الوقت<input type="time" value={time} onChange={e=>setTime(e.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2"/></label>
          </div>
          <button disabled={!date||!time} onClick={async()=>{
            const r=await fetch('/api/client-appointments/'+(client.nextAppointment?.id||''),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({date,time})});
            if(r.ok){setSchedule(false); window.location.reload();} else alert('تعذر تحديد الموعد');
          }} className="mt-2 rounded-lg bg-gold-500 px-4 py-2 text-xs font-extrabold text-navy-950 disabled:opacity-50">تأكيد الموعد</button>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={()=>files[0]&&window.open(files[0].url||`data:text/plain;charset=utf-8,${encodeURIComponent(files[0].text_content||'')}`,'_blank')} disabled={!files[0]} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-[11px] font-bold disabled:opacity-40"><Download size={13}/>تحميل</button>
        <button onClick={()=>files[0]&&onPreview({name:files[0].name,url:files[0].url,kind:files[0].kind,text:files[0].text_content})} disabled={!files[0]} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-[11px] font-bold disabled:opacity-40"><Eye size={13}/>اطلاع</button>
        <button onClick={()=>setShowAdd(v=>!v)} className="inline-flex items-center gap-1 rounded-lg bg-gold-500 px-3 py-2 text-[11px] font-bold text-navy-950"><Upload size={13}/>رفع/إضافة</button>
      </div>

      {showAdd&&(
        <div className="mt-3 rounded-xl bg-ivory-50 p-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="rounded-xl border bg-white p-3 text-xs font-bold">رفع ملف (حتى 100 ميجابايت)<input type="file" accept="image/png,image/jpeg,image/webp,.pdf,.doc,.docx,.mp4,.webm,.mp3,.wav,.ogg" onChange={e=>setFile(e.target.files?.[0]||null)} className="mt-2 w-full text-[10px]"/></label>
            <label className="rounded-xl border bg-white p-3 text-xs font-bold">رابط<input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://…" className="mt-2 w-full rounded-lg border p-2 text-xs"/></label>
            <label className="rounded-xl border bg-white p-3 text-xs font-bold">ملاحظة<textarea value={text} onChange={e=>setText(e.target.value)} className="mt-2 w-full rounded-lg border p-2 text-xs" placeholder="نص أو ملاحظة"/></label>
          </div>
          {file&&<div className="mt-2 rounded-lg bg-white p-2 text-xs">معاينة قبل الرفع: <b>{file.name}</b>{file.type.startsWith('image/')&&<img src={previewUrl} alt="معاينة" className="mt-2 max-h-40 max-w-full rounded"/>}</div>}
          {uploadProgress&&(
            <div className="mt-3 rounded-lg border border-navy-100 bg-white p-3" role="status" aria-live="polite">
              <div className="text-xs font-bold text-navy-700">
                {uploadProgress.stage==='preparing'?'جارٍ تجهيز رابط الرفع الآمن…':uploadProgress.stage==='uploading'? `جارٍ رفع الملف… ${uploadProgress.percentage}%` : 'تم رفع الملف، جارٍ حفظ بياناته…'}
              </div>
              {uploadProgress.stage==='uploading'&&(
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-navy-100">
                  <div className="h-full rounded-full bg-gold-500 transition-all duration-150" style={{width:`${uploadProgress.percentage}%`}}/>
                </div>
              )}
            </div>
          )}
          {uploadError&&<p role="alert" className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs font-bold text-red-700">{uploadError}</p>}
          <button type="button" disabled={isSubmittingUpload} onClick={()=>void confirmUpload()} aria-busy={isSubmittingUpload} className="mt-2 rounded-lg bg-navy-950 px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">
            {isSubmittingUpload
              ? uploadProgress?.stage==='preparing' ? 'جارٍ تجهيز رابط الرفع…' : uploadProgress?.stage==='uploading' ? `جارٍ رفع الملف… ${uploadProgress.percentage}%` : 'جارٍ حفظ الملف…'
              : 'تأكيد الرفع'}
          </button>
        </div>
      )}

      {open&&(
        <div className="mt-3 border-t pt-3">
          <div className="mb-2 text-[11px] font-extrabold text-navy-500">ملفات العميل</div>
          {files.length?files.map(f=>
            <div key={f.id} className="flex items-center justify-between rounded-lg bg-ivory-50 px-3 py-2 text-xs">
              <span className="font-bold">{f.name}</span>
              <div className="flex gap-2">
                {f.url&&<a href={f.url?.startsWith('/api/clients/') ? `${f.url}?download=1` : f.url} target="_blank" rel="noreferrer" className="text-navy-700"><Download size={13}/></a>}
                <button onClick={()=>onPreview({name:f.name,url:f.url,kind:f.kind,text:f.text_content})} className="text-gold-700"><Eye size={13}/></button>
              </div>
            </div>
          ):<div className="text-xs text-navy-400">لا توجد ملفات مضافة.</div>}
        </div>
      )}
    </div>
  );
}

function FilePreview({item,onClose}:{item:any;onClose:()=>void}) {
  const name = String(item.name || 'ملف');
  const extension = name.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
  const kind = item.kind || '';
  const isImage = kind === 'image' || ['.png','.jpg','.jpeg','.webp'].includes(extension);
  const isPdf = kind === 'pdf' || extension === '.pdf';
  const isVideo = kind === 'video' || ['.mp4','.webm'].includes(extension);
  const isAudio = kind === 'audio' || ['.mp3','.wav','.ogg'].includes(extension);
  const isWord = kind === 'word' || ['.doc','.docx'].includes(extension);
  const isLink = kind === 'link';
  const url = typeof item.url === 'string' ? item.url : '';
  const downloadUrl = url.startsWith('/api/clients/')
    ? url + (url.includes('?') ? '&' : '?') + 'download=1'
    : url;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-navy-950/75 p-2 sm:p-4" role="dialog" aria-modal="true" aria-label={'معاينة '+name}>
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-navy-100 px-4 py-3">
          <div className="min-w-0">
            <b className="block truncate text-sm text-navy-950">{name}</b>
            <span className="text-[11px] text-navy-400">
              {isPdf ? 'عارض PDF' : isImage ? 'عارض الصور' : isVideo ? 'مشغل فيديو' : isAudio ? 'مشغل صوت' : isWord ? 'مستند Word' : isLink ? 'رابط خارجي' : 'معاينة الملف'}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {url && !isLink && <a href={downloadUrl} className="inline-flex items-center gap-1 rounded-lg border border-navy-200 px-3 py-2 text-xs font-bold text-navy-800 hover:bg-navy-50"><Download size={14}/>تحميل</a>}
            <button type="button" onClick={onClose} aria-label="إغلاق المعاينة" className="rounded-lg border border-navy-200 p-2 text-navy-700 hover:bg-navy-50"><X size={18}/></button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-2 sm:p-4">
          {url && isImage ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <img src={url} alt={name} className="max-h-[78vh] max-w-full rounded-lg object-contain" />
            </div>
          ) : url && isPdf ? (
            <iframe
              title={'عارض PDF: '+name}
              src={url+'#toolbar=1&navpanes=0&view=FitH'}
              className="h-[78vh] min-h-[420px] w-full rounded-lg border border-slate-200 bg-white"
              referrerPolicy="same-origin"
            />
          ) : url && isVideo ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <video controls playsInline preload="metadata" src={url} className="max-h-[78vh] w-full max-w-4xl rounded-xl bg-black">
                المتصفح لا يدعم تشغيل هذا الفيديو.
              </video>
            </div>
          ) : url && isAudio ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-5 rounded-xl bg-white p-6">
              <div className="flex size-20 items-center justify-center rounded-full bg-navy-50 text-navy-800"><FileText size={32}/></div>
              <div className="text-center">
                <b className="text-sm text-navy-950">{name}</b>
                <p className="mt-1 text-xs text-navy-500">تشغيل الملف الصوتي</p>
              </div>
              <audio controls preload="metadata" src={url} className="w-full max-w-2xl">
                المتصفح لا يدعم تشغيل هذا الملف الصوتي.
              </audio>
            </div>
          ) : url && isWord ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-xl bg-white p-8 text-center">
              <FileText size={42} className="text-navy-500"/>
              <h3 className="mt-4 text-base font-extrabold text-navy-950">مستند Word</h3>
              <p className="mt-2 max-w-md text-sm leading-7 text-navy-500">المتصفح لا يعرض ملفات DOC وDOCX بشكل موثوق داخل المشغل. حمّل المستند لفتحه كاملًا مع الحفاظ على تنسيقه.</p>
              <a href={downloadUrl} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-navy-950 px-5 py-3 text-sm font-bold text-white"><Download size={16}/>تحميل المستند</a>
            </div>
          ) : url && isLink ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-xl bg-white p-8 text-center">
              <p className="text-sm font-bold text-navy-800">هذا عنصر محفوظ كرابط خارجي.</p>
              <a href={url} target="_blank" rel="noopener noreferrer" className="mt-4 break-all text-sm font-bold text-blue-700 underline">فتح الرابط في علامة تبويب جديدة</a>
            </div>
          ) : url ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-xl bg-white p-8 text-center">
              <FileText size={42} className="text-navy-500"/>
              <p className="mt-3 text-sm text-navy-600">لا يوجد مشغل مناسب لهذا النوع من الملفات.</p>
              <a href={downloadUrl} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-navy-950 px-5 py-3 text-sm font-bold text-white"><Download size={16}/>تحميل الملف</a>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap rounded-xl bg-white p-4 text-sm leading-7 text-navy-900">{item.text||'لا يوجد محتوى نصي.'}</pre>
          )}
        </div>
      </div>
    </div>
  );
}
