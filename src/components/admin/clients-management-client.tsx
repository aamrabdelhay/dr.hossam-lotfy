'use client';

import * as React from 'react';
import { Check, X, Upload, Eye, Download, FileText, Plus, CalendarDays, Clock } from 'lucide-react';

type Appointment = { date: string | null; time: string | null; type: string; status: string; id?: string };
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

  const loadFiles=async(id:string)=>{
    if(files[id]){
      setOpen(open===id?null:id);
      return;
    }
    const r=await fetch(`/api/clients/${id}/files`);
    const j=await r.json();
    setFiles(x=>({...x,[id]:j.files||[]}));
    setOpen(id);
  };

  const upload=async(id:string,mode:'file'|'link'|'note',value:any)=>{
    const fd=new FormData();
    if(mode==='file')fd.append('file',value.file);
    else{
      fd.append('name',value.name||'ملاحظة');
      fd.append('text',value.text||'');
      if(value.url)fd.append('url',value.url);
      fd.append('kind',mode);
    }
    const r=await fetch(`/api/clients/${id}/files`,{
      method:'POST',
      body:mode==='file'?fd:JSON.stringify({name:value.name,kind:mode,url:value.url,text:value.text}),
      headers:mode==='file'?undefined:{'Content-Type':'application/json'}
    });
    if(r.ok){
      const j=await r.json();
      const item={id:j.id,name:value.name||value.file?.name||'ملف جديد',kind:mode,url:j.url||value.url||'',text_content:value.text||null};
      setFiles(x=>({...x,[id]:[...(x[id]||[]),item]}));
      setOpen(id);
      return true;
    }
    alert((await r.json().catch(()=>({}))).error||'تعذر إضافة الملف');
    return false;
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
  onPreview,
  onUpload,
}: {
  client:Client;
  files:any[];
  open:boolean;
  onOpen:()=>void;
  onStatus:(id:string,status:string)=>void;
  onPreview:(x:any)=>void;
  onUpload:(id:string,mode:'file'|'link'|'note',v:any)=>Promise<boolean>;
}) {
  const [file,setFile]=React.useState<File|null>(null);
  const [url,setUrl]=React.useState('');
  const [text,setText]=React.useState('');
  const [showAdd,setShowAdd]=React.useState(false);
  const [schedule,setSchedule]=React.useState(false);
  const [date,setDate]=React.useState('');
  const [time,setTime]=React.useState('');

  const previewUrl=file?URL.createObjectURL(file):'';

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
        <div className="flex flex-wrap gap-1.5">
          {client.status==='POTENTIAL'&&<>
            <button onClick={()=>onStatus(client.id,'MAIN')} title="قبول" className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><Check size={15}/></button>
            <button onClick={()=>onStatus(client.id,'REJECTED')} title="رفض" className="rounded-lg bg-red-50 p-2 text-red-700"><X size={15}/></button>
          </>}
          <button onClick={onOpen} className="rounded-lg border p-2 text-navy-600" title="ملفات العميل"><FileText size={15}/></button>
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
            <label className="rounded-xl border bg-white p-3 text-xs font-bold">رفع ملف<input type="file" accept="image/*,.pdf,.doc,.docx" onChange={e=>setFile(e.target.files?.[0]||null)} className="mt-2 w-full text-[10px]"/></label>
            <label className="rounded-xl border bg-white p-3 text-xs font-bold">رابط<input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://…" className="mt-2 w-full rounded-lg border p-2 text-xs"/></label>
            <label className="rounded-xl border bg-white p-3 text-xs font-bold">ملاحظة<textarea value={text} onChange={e=>setText(e.target.value)} className="mt-2 w-full rounded-lg border p-2 text-xs" placeholder="نص أو ملاحظة"/></label>
          </div>
          {file&&<div className="mt-2 rounded-lg bg-white p-2 text-xs">معاينة قبل الرفع: <b>{file.name}</b>{file.type.startsWith('image/')&&<img src={previewUrl} alt="معاينة" className="mt-2 max-h-40 max-w-full rounded"/>}</div>}
          <button onClick={async()=>{
            if(file){
              const ok=await onUpload(client.id,'file',{name:file.name,file});
              if(ok){setFile(null);setShowAdd(false)}
            }else if(url.trim()){
              const ok=await onUpload(client.id,'link',{name:url.trim(),url:url.trim()});
              if(ok){setUrl('');setShowAdd(false)}
            }else if(text.trim()){
              const ok=await onUpload(client.id,'note',{name:'ملاحظة',text:text.trim()});
              if(ok){setText('');setShowAdd(false)}
            }
          }} className="mt-2 rounded-lg bg-navy-950 px-4 py-2 text-xs font-bold text-white">تأكيد الرفع</button>
        </div>
      )}

      {open&&(
        <div className="mt-3 border-t pt-3">
          <div className="mb-2 text-[11px] font-extrabold text-navy-500">ملفات العميل</div>
          {files.length?files.map(f=>
            <div key={f.id} className="flex items-center justify-between rounded-lg bg-ivory-50 px-3 py-2 text-xs">
              <span className="font-bold">{f.name}</span>
              <div className="flex gap-2">
                {f.url&&<a href={f.url} target="_blank" rel="noreferrer" className="text-navy-700"><Download size={13}/></a>}
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
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-navy-950/60 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-4">
        <div className="flex items-center justify-between"><b>{item.name}</b><button onClick={onClose}><X size={18}/></button></div>
        {item.url
          ? (item.kind==='image'
            ? <img src={item.url} alt={item.name} className="mx-auto mt-4 max-h-[70vh] max-w-full"/>
            : <iframe title={item.name} src={item.url} className="mt-4 h-[70vh] w-full rounded-lg border"/>)
          : <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-ivory-50 p-4 text-sm leading-7">{item.text||'لا يوجد محتوى نصي.'}</pre>}
      </div>
    </div>
  );
}
