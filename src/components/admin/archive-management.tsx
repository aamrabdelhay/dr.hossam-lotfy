'use client';

import * as React from 'react';
import { Archive, RotateCcw, Search, Users, BriefcaseBusiness, UserRound, FileText, ListChecks } from 'lucide-react';

type Entry = {
  id:string; entity_type:string; entity_id:string; label:string|null; snapshot_json:any;
  deleted_at:string; restored_at:string|null; deleted_by_user_name?:string|null; deleted_by_lawyer_name?:string|null;
};

const TYPES:Record<string,{label:string;icon:React.ReactNode}> = {
  ALL:{label:'الكل',icon:<Archive size={15}/>},
  client:{label:'العملاء',icon:<UserRound size={15}/>},
  case:{label:'القضايا',icon:<BriefcaseBusiness size={15}/>},
  lawyer:{label:'المحامون',icon:<Users size={15}/>},
  task:{label:'المهام والجلسات',icon:<ListChecks size={15}/>},
  file:{label:'ملفات العملاء',icon:<FileText size={15}/>},
};

const LABELS:Record<string,string>={client:'عميل',case:'قضية',lawyer:'محامٍ',task:'مهمة / جلسة',file:'ملف',expense:'مصروف',request_rejected:'طلب مرفوض'};

export function ArchiveManagement({initialEntries}:{initialEntries:Entry[]}) {
  const [entries,setEntries]=React.useState(initialEntries);
  const [tab,setTab]=React.useState('ALL');
  const [q,setQ]=React.useState('');
  const [busy,setBusy]=React.useState<string|null>(null);

  const restore=async(id:string)=>{
    setBusy(id);
    try{
      const r=await fetch('/api/admin/office',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'restore',id})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(d.error||'تعذر الاسترجاع');
      setEntries(v=>v.map(x=>x.id===id?{...x,restored_at:new Date().toISOString()}:x));
    }catch(e){alert(e instanceof Error?e.message:'تعذر الاسترجاع');}
    finally{setBusy(null);}
  };

  const filtered=entries.filter(x=>{
    const typeOk=tab==='ALL'||x.entity_type===tab;
    const text=`${x.label||''} ${x.entity_id} ${LABELS[x.entity_type]||x.entity_type}`.toLowerCase();
    return typeOk&&text.includes(q.trim().toLowerCase());
  });
  const activeCount=entries.filter(x=>!x.restored_at).length;

  return <div dir="rtl" className="space-y-5">
    <div className="flex flex-wrap gap-2">
      {Object.entries(TYPES).map(([id,v])=><button key={id} onClick={()=>setTab(id)} className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-extrabold ${tab===id?'bg-navy-950 text-white':'border border-navy-200 bg-white text-navy-600'}`}>{v.icon}{v.label} {id==='ALL'&&<span>({activeCount})</span>}</button>)}
    </div>
    <div className="relative">
      <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-navy-300"/>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="ابحث باسم العميل أو القضية أو المحامي أو العنصر المحذوف…" className="w-full rounded-xl border border-navy-200 bg-white py-3 ps-10 pe-3 text-sm"/>
    </div>
    <div className="rounded-2xl border border-gold-200 bg-gold-50/40 p-4 text-xs leading-6 text-navy-700">
      <b>الأرشيف منظم حسب نوع العنصر.</b> يمكنك البحث أو اختيار القسم، ثم استرجاع أي عنصر غير مسترجع بضغطة واحدة. الاسترجاع يعيد العنصر إلى حالته السابقة المحفوظة.
    </div>
    <div className="space-y-2">
      {filtered.length?filtered.map(x=><div key={x.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-navy-100 bg-white p-4 shadow-sm">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><b className="truncate text-sm text-navy-950">{x.label||x.entity_id}</b><span className="rounded-full bg-navy-50 px-2 py-1 text-[10px] font-extrabold text-navy-500">{LABELS[x.entity_type]||x.entity_type}</span>{x.restored_at&&<span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-extrabold text-emerald-700">تم الاسترجاع</span>}</div>
          <div className="mt-1 text-[11px] text-navy-400">حُذف في {new Date(x.deleted_at).toLocaleString('ar-EG',{hour12:false})} {x.deleted_by_user_name||x.deleted_by_lawyer_name?\` • بواسطة ${x.deleted_by_user_name||x.deleted_by_lawyer_name}\`:''}</div>
        </div>
        {!x.restored_at && x.entity_type!=='request_rejected' && <button disabled={busy===x.id} onClick={()=>void restore(x.id)} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-extrabold text-emerald-700 disabled:opacity-50"><RotateCcw size={14}/>{busy===x.id?'جارٍ الاسترجاع…':'استرجاع'}</button>}
      </div>):<div className="rounded-2xl border border-dashed p-10 text-center text-sm font-bold text-navy-400">لا توجد عناصر مطابقة.</div>}
    </div>
  </div>;
}
