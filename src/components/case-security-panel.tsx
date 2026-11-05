"use client";
import * as React from "react";
import { ShieldCheck, Save, Users, AlertCircle, RefreshCw } from "lucide-react";

type Person = {id:string;name:string;email?:string|null;role?:string};
type Grant = {userId?:string|null;lawyerId?:string|null;accessLevel:'VIEW'|'EDIT';name?:string;email?:string|null};

export function CaseSecurityPanel({caseId}:{caseId:string}) {
  const [classification,setClassification]=React.useState('INTERNAL');
  const [ethicalWallEnabled,setEthicalWallEnabled]=React.useState(false);
  const [reason,setReason]=React.useState('');
  const [lawyers,setLawyers]=React.useState<Person[]>([]);
  const [users,setUsers]=React.useState<Person[]>([]);
  const [grants,setGrants]=React.useState<Grant[]>([]);
  const [loading,setLoading]=React.useState(true);
  const [saving,setSaving]=React.useState(false);
  const [error,setError]=React.useState('');
  const [notice,setNotice]=React.useState('');

  const load=React.useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const response=await fetch('/api/cases/'+encodeURIComponent(caseId)+'/security',{cache:'no-store'});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||'تعذر تحميل إعدادات سرية القضية');
      setClassification(data.settings?.classification||'INTERNAL');
      setEthicalWallEnabled(Boolean(data.settings?.ethical_wall_enabled));
      setReason(data.settings?.reason||'');
      setLawyers(Array.isArray(data.lawyers)?data.lawyers:[]);
      setUsers(Array.isArray(data.users)?data.users:[]);
      setGrants(Array.isArray(data.grants)?data.grants.map((g:Grant)=>({userId:g.userId,lawyerId:g.lawyerId,accessLevel:g.accessLevel,name:g.name,email:g.email})):[]);
    }catch(e){setError(e instanceof Error?e.message:'حدث خطأ أثناء التحميل');}
    finally{setLoading(false);}
  },[caseId]);
  React.useEffect(()=>{void load();},[load]);

  function toggle(type:'user'|'lawyer',id:string,checked:boolean){
    setGrants(current=>{
      const without=current.filter(g=>type==='user'?g.userId!==id:g.lawyerId!==id);
      if(!checked)return without;
      return [...without,{userId:type==='user'?id:null,lawyerId:type==='lawyer'?id:null,accessLevel:'VIEW'}];
    });
  }
  function selected(type:'user'|'lawyer',id:string){
    return grants.some(g=>type==='user'?g.userId===id:g.lawyerId===id);
  }
  function level(type:'user'|'lawyer',id:string){
    return grants.find(g=>type==='user'?g.userId===id:g.lawyerId===id)?.accessLevel||'VIEW';
  }
  function setLevel(type:'user'|'lawyer',id:string,value:'VIEW'|'EDIT'){
    setGrants(current=>current.map(g=>(type==='user'?g.userId===id:g.lawyerId===id)?{...g,accessLevel:value}:g));
  }
  async function save(){
    setSaving(true);setError('');setNotice('');
    try{
      const response=await fetch('/api/cases/'+encodeURIComponent(caseId)+'/security',{
        method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({classification,ethicalWallEnabled,reason:reason.trim(),grants:grants.map(g=>({userId:g.userId||undefined,lawyerId:g.lawyerId||undefined,accessLevel:g.accessLevel}))}),
      });
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||'تعذر حفظ إعدادات السرية');
      setNotice('تم حفظ تصنيف السرية وقائمة المصرح لهم.');
      await load();
    }catch(e){setError(e instanceof Error?e.message:'تعذر الحفظ');}
    finally{setSaving(false);}
  }
  function personRow(person:Person,type:'user'|'lawyer'){
    const checked=selected(type,person.id);
    return <div key={type+':'+person.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-navy-100 px-3 py-2.5">
      <label className="flex min-w-0 flex-1 items-center gap-2 text-xs font-bold text-navy-800">
        <input type="checkbox" checked={checked} onChange={e=>toggle(type,person.id,e.target.checked)} className="h-4 w-4 accent-amber-700"/>
        <span className="min-w-0"><span className="block truncate">{person.name}</span><span className="block truncate text-[10px] font-medium text-navy-400">{person.email||person.role||(type==='lawyer'?'محامٍ':'حساب داخلي')}</span></span>
      </label>
      {checked&&<select aria-label={'مستوى صلاحية '+person.name} value={level(type,person.id)} onChange={e=>setLevel(type,person.id,e.target.value as 'VIEW'|'EDIT')} className="rounded-lg border border-navy-200 bg-white px-2 py-1.5 text-[10px] font-bold text-navy-700"><option value="VIEW">عرض فقط</option><option value="EDIT">عرض وتعديل</option></select>}
    </div>;
  }

  return <section className="my-5 rounded-2xl border border-gold-200 bg-white shadow-sm" dir="rtl">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-100 px-5 py-4">
      <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-500/10 text-gold-700"><ShieldCheck size={18}/></span><div><h2 className="text-sm font-black text-navy-950">سرية القضية والحواجز السرية</h2><p className="mt-1 text-[10px] font-semibold text-navy-400">تحديد مستوى السرية ومن يمكنه الاطلاع على القضية</p></div></div>
      <button type="button" onClick={()=>void load()} disabled={loading||saving} className="inline-flex items-center gap-1 rounded-lg border border-navy-200 px-3 py-2 text-[10px] font-bold text-navy-600"><RefreshCw size={13}/> تحديث</button>
    </div>
    {loading?<p className="p-6 text-center text-xs font-semibold text-navy-400">جارٍ تحميل إعدادات السرية...</p>:<div className="space-y-4 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-extrabold text-navy-700">تصنيف القضية<select value={classification} onChange={e=>setClassification(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-navy-200 bg-white px-3 text-xs font-semibold"><option value="INTERNAL">داخلي</option><option value="CONFIDENTIAL">سري</option><option value="HIGHLY_CONFIDENTIAL">شديد السرية</option></select></label>
        <label className="flex items-center gap-2 self-end rounded-xl border border-navy-200 bg-ivory-50 px-3 py-3 text-xs font-bold text-navy-700"><input type="checkbox" checked={ethicalWallEnabled} onChange={e=>setEthicalWallEnabled(e.target.checked)} className="h-4 w-4 accent-amber-700"/>تفعيل حاجز سري يمنع الاطلاع العام حتى داخل الفرع</label>
      </div>
      <label className="block text-xs font-extrabold text-navy-700">سبب التصنيف أو ملاحظات السرية<textarea value={reason} onChange={e=>setReason(e.target.value)} maxLength={1000} rows={2} placeholder="مثال: قضية تتضمن معلومات تجارية أو مستندات شديدة الحساسية..." className="mt-1.5 w-full rounded-xl border border-navy-200 px-3 py-2.5 text-xs outline-none focus:border-gold-500"/></label>
      <div className="flex items-center gap-2 text-xs font-black text-navy-800"><Users size={15} className="text-gold-700"/>الأشخاص المصرح لهم صراحةً</div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2"><h3 className="text-xs font-extrabold text-navy-700">المحامون</h3>{lawyers.length?lawyers.map(p=>personRow(p,'lawyer')):<p className="text-[11px] text-navy-400">لا يوجد محامون نشطون.</p>}</div>
        <div className="space-y-2"><h3 className="text-xs font-extrabold text-navy-700">حسابات الإدارة والموظفين</h3>{users.length?users.map(p=>personRow(p,'user')):<p className="text-[11px] text-navy-400">لا توجد حسابات داخلية.</p>}</div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-navy-100 pt-4"><p className="text-[10px] font-semibold text-navy-400">المختارون: {grants.length} · الوصول المحدد يُطبق على صفحة القضية وسجلها وملفاتها.</p><button type="button" disabled={saving} onClick={()=>void save()} className="inline-flex items-center gap-2 rounded-xl bg-navy-950 px-5 py-2.5 text-xs font-extrabold text-white disabled:opacity-50"><Save size={15}/>{saving?'جارٍ الحفظ...':'حفظ إعدادات السرية'}</button></div>
      {error&&<p role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700"><AlertCircle size={15}/>{error}</p>}
      {notice&&<p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">{notice}</p>}
    </div>}
  </section>;
}
