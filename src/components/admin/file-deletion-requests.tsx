'use client';

import * as React from 'react';

type RequestRow = {
  id:string; file_type:'client'|'case'; file_name:string; file_kind:string;
  size_bytes:number|null; reason:string; requested_at:string; requested_by_name:string;
  resource_name:string|null; status:string; decided_at:string|null; decision_note:string|null;
  archive_id:string|null; archive_expires_at:string|null; archive_url:string|null;
};
function dateLabel(value:string|null|undefined){return value?new Date(value).toLocaleString('ar-EG',{dateStyle:'medium',timeStyle:'short'}):'—';}
function sizeLabel(value:number|null){return !value?'':value>=1024*1024?(value/1024/1024).toFixed(1)+' ميجابايت':Math.max(1,Math.round(value/1024))+' ك.ب';}

export function FileDeletionRequests(){
  const [pending,setPending]=React.useState<RequestRow[]>([]);
  const [archives,setArchives]=React.useState<RequestRow[]>([]);
  const [loading,setLoading]=React.useState(true);
  const [busy,setBusy]=React.useState<string|null>(null);
  const [error,setError]=React.useState('');
  const [notice,setNotice]=React.useState('');
  const refresh=React.useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const response=await fetch('/api/admin/file-deletion-requests',{cache:'no-store'});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||'تعذر تحميل طلبات حذف الملفات.');
      setPending(Array.isArray(data.pending)?data.pending:[]);
      setArchives(Array.isArray(data.archives)?data.archives:[]);
    }catch(cause){setError(cause instanceof Error?cause.message:'تعذر تحميل البيانات.');}
    finally{setLoading(false);}
  },[]);
  React.useEffect(()=>{void refresh();},[refresh]);
  const act=async(id:string,action:'approve'|'reject'|'restore')=>{
    const labels={approve:'الموافقة على حذف الملف وإخفائه لمدة 31 يومًا؟',reject:'رفض طلب حذف الملف؟',restore:'استرجاع الملف إلى مكانه الأصلي؟'};
    if(!window.confirm(labels[action]))return;
    const decisionNote=action==='reject'?(window.prompt('سبب الرفض (اختياري):')||''):'';
    setBusy(id);setNotice('');setError('');
    try{
      const response=await fetch('/api/admin/file-deletion-requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,action,decisionNote})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||'تعذر تنفيذ القرار.');
      setNotice(action==='approve'?'تمت الموافقة ونُقل الملف إلى أرشيف الـ31 يومًا.':action==='reject'?'تم رفض الطلب وبقي الملف كما هو.':'تم استرجاع الملف بنجاح.');
      await refresh();
    }catch(cause){setError(cause instanceof Error?cause.message:'تعذر تنفيذ القرار.');}
    finally{setBusy(null);}
  };
  return <section className="rounded-2xl border border-navy-100 bg-white p-5 shadow-sm">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-[10px] font-black tracking-wide text-gold-700">حماية المستندات</p>
        <h2 className="mt-1 text-base font-extrabold text-navy-950">طلبات حذف الملفات وأرشيفها</h2>
        <p className="mt-1 text-xs leading-6 text-navy-400">لا يُخفى أي ملف قبل موافقة الإدارة العليا. الملفات الموافق على حذفها تبقى قابلة للفتح والاسترجاع لمدة 31 يومًا.</p>
      </div>
      <button type="button" onClick={()=>void refresh()} className="rounded-xl border border-navy-200 px-3 py-2 text-xs font-bold text-navy-600">تحديث</button>
    </div>
    {error&&<p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</p>}
    {notice&&<p role="status" className="mb-3 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700">{notice}</p>}
    <div className="mb-5 rounded-xl bg-ivory-50 p-4">
      <h3 className="mb-3 text-sm font-extrabold text-navy-900">طلبات تنتظر القرار ({pending.length})</h3>
      {loading?<p className="text-xs text-navy-400">جارٍ التحميل…</p>:pending.length===0?<p className="text-xs text-navy-400">لا توجد طلبات حذف معلّقة.</p>:<div className="space-y-3">
        {pending.map(item=><article key={item.id} className="rounded-xl border border-navy-100 bg-white p-3">
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0">
            <p className="break-words text-sm font-extrabold text-navy-900">{item.file_name}</p>
            <p className="mt-1 text-[10px] text-navy-400">{item.file_type==='case'?'ملف قضية':'ملف عميل'} · {item.resource_name||'الملف المرتبط'} · {sizeLabel(item.size_bytes)}</p>
            <p className="mt-1 text-[10px] text-navy-500">مقدم الطلب: {item.requested_by_name} · {dateLabel(item.requested_at)}</p>
            <p className="mt-2 rounded-lg bg-ivory-50 p-2 text-xs leading-5 text-navy-700">سبب الحذف: {item.reason}</p>
          </div><div className="flex shrink-0 gap-2">
            <button type="button" disabled={busy===item.id} onClick={()=>void act(item.id,'approve')} className="rounded-lg bg-emerald-700 px-3 py-2 text-[10px] font-extrabold text-white disabled:opacity-50">موافقة</button>
            <button type="button" disabled={busy===item.id} onClick={()=>void act(item.id,'reject')} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-extrabold text-red-700 disabled:opacity-50">رفض</button>
          </div></div>
        </article>)}
      </div>}
    </div>
    <div className="rounded-xl border border-gold-200 p-4">
      <h3 className="mb-3 text-sm font-extrabold text-navy-900">أرشيف الملفات الموافق على حذفها ({archives.length})</h3>
      {archives.length===0?<p className="text-xs text-navy-400">لا توجد ملفات داخل الأرشيف حاليًا.</p>:<div className="space-y-2">
        {archives.map(item=><article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ivory-50 p-3">
          <div className="min-w-0"><p className="break-words text-xs font-extrabold text-navy-900">{item.file_name}</p>
            <p className="mt-1 text-[10px] text-navy-400">{item.file_type==='case'?'ملف قضية':'ملف عميل'} · {item.resource_name||'الملف المرتبط'}</p>
            <p className="mt-1 text-[10px] text-navy-500">تاريخ الموافقة: {dateLabel(item.decided_at)} · تنتهي الأرشفة: {dateLabel(item.archive_expires_at)}</p>
          </div><div className="flex shrink-0 items-center gap-2">
            {item.archive_url&&<a href={item.archive_url} target="_blank" rel="noreferrer" className="rounded-lg border border-navy-200 bg-white px-3 py-2 text-[10px] font-bold text-navy-700">فتح الملف</a>}
            <button type="button" disabled={busy===item.id} onClick={()=>void act(item.id,'restore')} className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[10px] font-extrabold text-emerald-700 disabled:opacity-50">استرجاع</button>
          </div>
        </article>)}
      </div>}
    </div>
    <p className="mt-3 text-[10px] leading-5 text-navy-400">بعد انتهاء مدة الأرشفة، تُحذف النسخة المخزنة فقط للطلبات التي وافقت عليها الإدارة العليا، وتظل سجلات القرار محفوظة.</p>
  </section>;
}
