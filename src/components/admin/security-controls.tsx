'use client';

import * as React from 'react';
import { RefreshCw, ShieldCheck, ShieldOff, Clock3, FileClock, ClipboardList } from 'lucide-react';

type Staff = {id:string;name:string;email:string;role:string};
type Override = {id:string;userId:string;userName:string;permissionKey:string;allowed:boolean;reason:string;updatedAt:string};
type Delegation = {id:string;userId:string;userName:string;permissionKey:string;reason:string;startsAt:string;expiresAt:string};
type Policy = {resourceType:'case_file'|'client_file';retentionDays:number;enabled:boolean;pendingReviews:number};
type Review = {id:string;resourceType:string;resourceId:string;fileId:string;fileName:string;fileCreatedAt:string;detectedAt:string;status:string};
type Event = {id:string;action:string;resourceType:string|null;resourceId:string|null;summary:string;createdAt:string;actorName:string};
type Data = {users:Staff[];overrides:Override[];delegations:Delegation[];policies:Policy[];reviews:Review[];events:Event[]};

const permissionLabels:Record<string,string> = {
  manageUsers:'إدارة المستخدمين',
  manageLawyers:'إدارة المحامين',
  manageLocations:'إدارة المحاكم والجهات',
  writeTasks:'إضافة وتعديل المهام والجلسات',
  comment:'التعليق',
  viewAdmin:'دخول الإدارة الداخلية',
};
const emptyData:Data={users:[],overrides:[],delegations:[],policies:[],reviews:[],events:[]};

export function SecurityControls() {
  const [data,setData]=React.useState<Data>(emptyData);
  const [loading,setLoading]=React.useState(true);
  const [busy,setBusy]=React.useState(false);
  const [error,setError]=React.useState('');
  const [notice,setNotice]=React.useState('');
  const [userId,setUserId]=React.useState('');
  const [permissionKey,setPermissionKey]=React.useState('writeTasks');
  const [allowed,setAllowed]=React.useState('false');
  const [reason,setReason]=React.useState('');
  const [delegateHours,setDelegateHours]=React.useState('8');
  const [delegateReason,setDelegateReason]=React.useState('');
  const [caseDays,setCaseDays]=React.useState('3650');
  const [clientDays,setClientDays]=React.useState('3650');
  const [caseEnabled,setCaseEnabled]=React.useState(false);
  const [clientEnabled,setClientEnabled]=React.useState(false);

  const load=React.useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const response=await fetch('/api/admin/security-controls',{cache:'no-store'});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'تعذر تحميل إعدادات الحوكمة');
      const next=result as Data;
      setData(next);
      const cp=next.policies.find(p=>p.resourceType==='case_file');
      const clp=next.policies.find(p=>p.resourceType==='client_file');
      setCaseDays(String(cp?.retentionDays??3650));setCaseEnabled(Boolean(cp?.enabled));
      setClientDays(String(clp?.retentionDays??3650));setClientEnabled(Boolean(clp?.enabled));
      if(!userId&&next.users[0])setUserId(next.users[0].id);
    }catch(e){setError(e instanceof Error?e.message:'تعذر تحميل الإعدادات');}
    finally{setLoading(false);}
  },[userId]);
  React.useEffect(()=>{void load();},[load]);

  async function send(body:Record<string,unknown>){
    setBusy(true);setError('');setNotice('');
    try{
      const response=await fetch('/api/admin/security-controls',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'تعذر حفظ التغييرات');
      setNotice(result.message||'تم الحفظ بنجاح');await load();
    }catch(e){setError(e instanceof Error?e.message:'حدث خطأ أثناء الحفظ');}
    finally{setBusy(false);}
  }
  async function revoke(type:'override'|'delegation',id:string){
    setBusy(true);setError('');setNotice('');
    try{
      const response=await fetch('/api/admin/security-controls?type='+type+'&id='+encodeURIComponent(id),{method:'DELETE'});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'تعذر الإلغاء');
      setNotice('تم إلغاء الصلاحية');await load();
    }catch(e){setError(e instanceof Error?e.message:'تعذر الإلغاء');}
    finally{setBusy(false);}
  }
  async function saveRetention(resourceType:'case_file'|'client_file'){
    const isCase=resourceType==='case_file';
    await send({type:'retention',resourceType,retentionDays:Number(isCase?caseDays:clientDays),enabled:isCase?caseEnabled:clientEnabled});
  }
  async function decide(reviewId:string,decision:'RETAINED'|'ARCHIVE_REQUESTED'){
    await send({type:'retention_review',reviewId,decision});
  }

  return <section className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-sm" dir="rtl">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-100 bg-ivory-50/60 px-5 py-4">
      <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500/10 text-gold-700"><ShieldCheck size={20}/></span><div><h2 className="text-sm font-black text-navy-950">مركز الحوكمة والأمان</h2><p className="mt-1 text-[10px] text-navy-400">الصلاحيات الفردية، التفويض المؤقت، سجل التدقيق، وسياسة مراجعة الاحتفاظ</p></div></div>
      <button type="button" onClick={()=>void load()} disabled={loading||busy} className="inline-flex items-center gap-2 rounded-lg border border-navy-200 bg-white px-3 py-2 text-[10px] font-bold text-navy-600"><RefreshCw size={13}/> تحديث</button>
    </header>
    {loading?<div className="p-8 text-center text-xs text-navy-400">جارٍ تحميل مركز الحوكمة...</div>:<div className="space-y-6 p-5">
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-navy-100 p-4">
          <h3 className="text-xs font-black text-navy-900">صلاحيات فردية حسب الحساب</h3>
          <label className="block text-[11px] font-bold text-navy-600">الحساب<select value={userId} onChange={e=>setUserId(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-navy-200 bg-white px-3">{data.users.map(u=><option key={u.id} value={u.id}>{u.name} — {u.role}</option>)}</select></label>
          <label className="block text-[11px] font-bold text-navy-600">الصلاحية<select value={permissionKey} onChange={e=>setPermissionKey(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-navy-200 bg-white px-3">{Object.entries(permissionLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-2"><label className="text-[11px] font-bold text-navy-600">القرار<select value={allowed} onChange={e=>setAllowed(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-navy-200 bg-white px-3"><option value="true">منح الصلاحية</option><option value="false">منع الصلاحية</option></select></label><label className="text-[11px] font-bold text-navy-600">سبب القرار<input value={reason} onChange={e=>setReason(e.target.value)} maxLength={1000} className="mt-1.5 h-10 w-full rounded-lg border border-navy-200 px-3" placeholder="سبب إداري موثق"/></label></div>
          <button type="button" disabled={busy||!userId||reason.trim().length<5} onClick={()=>void send({type:'override',userId,permissionKey,allowed:allowed==='true',reason})} className="w-full rounded-lg bg-navy-950 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-40">حفظ الصلاحية التفصيلية</button>
          {data.overrides.length>0&&<div className="space-y-2 border-t border-navy-100 pt-3"><p className="text-[10px] font-black text-navy-500">الصلاحيات الفردية السارية</p>{data.overrides.map(o=><div key={o.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-ivory-50 p-2 text-[10px]"><span className="min-w-0 flex-1"><b>{o.userName}</b> · {permissionLabels[o.permissionKey]||o.permissionKey} · {o.allowed?'ممنوحة':'ممنوعة'}</span><button type="button" disabled={busy} onClick={()=>void revoke('override',o.id)} className="text-rose-700">إلغاء</button></div>)}</div>}
        </div>
        <div className="space-y-3 rounded-xl border border-navy-100 p-4">
          <h3 className="flex items-center gap-2 text-xs font-black text-navy-900"><Clock3 size={15}/> تفويض مؤقت بصلاحية</h3>
          <label className="block text-[11px] font-bold text-navy-600">المفوّض إليه<select value={userId} onChange={e=>setUserId(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-navy-200 bg-white px-3">{data.users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
          <label className="block text-[11px] font-bold text-navy-600">الصلاحية<select value={permissionKey} onChange={e=>setPermissionKey(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-navy-200 bg-white px-3">{Object.entries(permissionLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-2"><label className="text-[11px] font-bold text-navy-600">عدد الساعات<input type="number" min="1" max="720" value={delegateHours} onChange={e=>setDelegateHours(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-navy-200 px-3"/></label><label className="text-[11px] font-bold text-navy-600">سبب التفويض<input value={delegateReason} onChange={e=>setDelegateReason(e.target.value)} maxLength={1000} className="mt-1.5 h-10 w-full rounded-lg border border-navy-200 px-3" placeholder="سبب ومدة الحاجة"/></label></div>
          <button type="button" disabled={busy||!userId||!delegateReason.trim()||Number(delegateHours)<1||Number(delegateHours)>720} onClick={()=>void send({type:'delegation',userId,permissionKey,expiresInHours:Number(delegateHours),reason:delegateReason})} className="w-full rounded-lg border border-gold-600 bg-gold-500/10 px-3 py-2.5 text-xs font-bold text-navy-900 disabled:opacity-40">إنشاء التفويض</button>
          {data.delegations.length>0&&<div className="space-y-2 border-t border-navy-100 pt-3"><p className="text-[10px] font-black text-navy-500">التفويضات السارية</p>{data.delegations.map(d=><div key={d.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-ivory-50 p-2 text-[10px]"><span className="min-w-0 flex-1"><b>{d.userName}</b> · {permissionLabels[d.permissionKey]||d.permissionKey} · ينتهي {new Date(d.expiresAt).toLocaleString('ar-EG')}</span><button type="button" disabled={busy} onClick={()=>void revoke('delegation',d.id)} className="text-rose-700">إلغاء</button></div>)}</div>}
        </div>
      </div>

      <div className="rounded-xl border border-navy-100 p-4">
        <h3 className="flex items-center gap-2 text-xs font-black text-navy-900"><FileClock size={15}/> سياسة الاحتفاظ بالملفات</h3>
        <p className="mt-1 text-[10px] text-navy-400">هذه السياسة تحوّل الملفات القديمة إلى قائمة مراجعة. لا يوجد حذف آلي؛ يلزم قرار بشري ومراجعة مستقلة.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 rounded-lg bg-ivory-50 p-3"><b className="text-[11px]">ملفات القضايا</b><label className="flex items-center gap-2 text-[10px]"><input type="checkbox" checked={caseEnabled} onChange={e=>setCaseEnabled(e.target.checked)}/>تفعيل التنبيه بعد <input type="number" min="30" max="36500" value={caseDays} onChange={e=>setCaseDays(e.target.value)} className="h-8 w-24 rounded border border-navy-200 px-2"/> يوم</label><button type="button" disabled={busy||Number(caseDays)<30||Number(caseDays)>36500} onClick={()=>void saveRetention('case_file')} className="rounded-lg bg-navy-950 px-3 py-2 text-[10px] font-bold text-white">حفظ سياسة القضايا</button></div>
          <div className="space-y-2 rounded-lg bg-ivory-50 p-3"><b className="text-[11px]">ملفات العملاء</b><label className="flex items-center gap-2 text-[10px]"><input type="checkbox" checked={clientEnabled} onChange={e=>setClientEnabled(e.target.checked)}/>تفعيل التنبيه بعد <input type="number" min="30" max="36500" value={clientDays} onChange={e=>setClientDays(e.target.value)} className="h-8 w-24 rounded border border-navy-200 px-2"/> يوم</label><button type="button" disabled={busy||Number(clientDays)<30||Number(clientDays)>36500} onClick={()=>void saveRetention('client_file')} className="rounded-lg bg-navy-950 px-3 py-2 text-[10px] font-bold text-white">حفظ سياسة العملاء</button></div>
        </div>
        {data.policies.map(p=><p key={p.resourceType} className="mt-2 text-[10px] text-navy-500">{p.resourceType==='case_file'?'القضايا':'العملاء'}: {p.enabled?'مفعّلة':'متوقفة'} · {p.retentionDays} يوم · {p.pendingReviews} مراجعة معلقة</p>)}
        {data.reviews.length>0&&<div className="mt-4 space-y-2 border-t border-navy-100 pt-3"><b className="text-[11px]">قائمة الملفات المستحقة للمراجعة</b>{data.reviews.map(r=><div key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-ivory-50 p-3 text-[10px]"><span className="min-w-0 flex-1"><b>{r.fileName}</b> · {r.resourceType==='case_file'?'ملف قضية':'ملف عميل'} · تاريخ الإضافة {new Date(r.fileCreatedAt).toLocaleDateString('ar-EG')}</span><button type="button" disabled={busy} onClick={()=>void decide(r.id,'RETAINED')} className="rounded-md border border-emerald-300 px-2 py-1 text-emerald-800">الإبقاء عليه</button><button type="button" disabled={busy} onClick={()=>void decide(r.id,'ARCHIVE_REQUESTED')} className="rounded-md border border-gold-300 px-2 py-1 text-navy-800">طلب أرشفة يدوية</button></div>)}</div>}
      </div>

      <div className="rounded-xl border border-navy-100 p-4">
        <h3 className="flex items-center gap-2 text-xs font-black text-navy-900"><ClipboardList size={15}/> سجل التدقيق</h3>
        <p className="mb-3 mt-1 text-[10px] text-navy-400">آخر 60 عملية موثقة داخل المنظومة، مع اسم المنفذ والوقت ونوع السجل.</p>
        {data.events.length?<div className="max-h-[420px] space-y-1 overflow-y-auto">{data.events.map(e=><div key={e.id} className="grid gap-1 border-b border-navy-50 py-2 text-[10px] sm:grid-cols-[1fr_auto]"><span><b>{e.actorName}</b> · {e.summary}</span><time className="text-navy-400">{new Date(e.createdAt).toLocaleString('ar-EG')}</time></div>)}</div>:<p className="text-[10px] text-navy-400">لا توجد أحداث مسجلة حتى الآن.</p>}
      </div>
    </div>}
    {error&&<p role="alert" className="m-5 rounded-lg bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
    {notice&&<p role="status" className="m-5 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">{notice}</p>}
  </section>;
}
