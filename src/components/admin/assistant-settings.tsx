'use client';

import * as React from 'react';
import { CheckCircle2, CircleAlert, Loader2, Network, Save } from 'lucide-react';

export function AssistantSettings(){
  const[baseUrl,setBaseUrl]=React.useState('');
  const[model,setModel]=React.useState('');
  const[apiKey,setApiKey]=React.useState('');
  const[configured,setConfigured]=React.useState(false);
  const[busy,setBusy]=React.useState(true);
  const[testing,setTesting]=React.useState(false);
  const[status,setStatus]=React.useState<boolean|null>(null);
  const[msg,setMsg]=React.useState('');

  const load=React.useCallback(async()=>{
    setBusy(true);
    try{
      const r=await fetch('/api/admin/assistant-settings',{cache:'no-store'});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||'تعذر تحميل الإعدادات.');
      setBaseUrl(d.baseUrl||'');
      setModel(d.model||'');
      setConfigured(Boolean(d.keyConfigured||d.configured));
    }catch(e){setMsg(e instanceof Error?e.message:'تعذر تحميل إعدادات المساعد.');}
    finally{setBusy(false);}
  },[]);
  React.useEffect(()=>{void load()},[load]);

  const save=async()=>{
    setBusy(true);setStatus(null);setMsg('');
    try{
      const r=await fetch('/api/admin/assistant-settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({baseUrl,model,apiKey:apiKey.trim()||undefined})});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||'تعذر حفظ الإعدادات.');
      setConfigured(Boolean(d.keyConfigured||d.configured));
      setApiKey('');
      setMsg('تم حفظ إعدادات المساعد بنجاح.');
    }catch(e){setMsg(e instanceof Error?e.message:'تعذر حفظ الإعدادات.');}
    finally{setBusy(false);}
  };

  const test=async()=>{
    setTesting(true);setStatus(null);setMsg('');
    try{
      const r=await fetch('/api/admin/assistant-test',{method:'POST'});
      const d=await r.json();
      setStatus(Boolean(d.ok));
      setMsg(d.ok?'الاتصال يعمل مع الموديل '+(d.model||model)+'.':(d.error||'فشل اختبار الاتصال.')+(d.details?' — '+d.details:''));
    }catch{setStatus(false);setMsg('تعذر الوصول إلى خدمة اختبار الاتصال.')}
    finally{setTesting(false);}
  };

  return <section className="rounded-2xl border border-gold-200 bg-white p-5 shadow-sm">
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-50 text-gold-700"><Network size={18}/></span>
      <div><h2 className="font-extrabold text-navy-950">إعدادات API للمساعد الذكي</h2><p className="mt-1 text-xs leading-6 text-navy-400">يمكنك تغيير عنوان الـAPI والموديل والمفتاح من هنا. النظام يتعامل مع واجهة Chat Completions المتوافقة مع OpenAI.</p></div>
    </div>

    <div className="mt-5 grid gap-4">
      <div><label className="mb-1.5 block text-[11px] font-bold text-navy-700">عنوان الـAPI</label><input value={baseUrl} onChange={e=>setBaseUrl(e.target.value)} dir="ltr" className="w-full rounded-xl border border-navy-200 bg-white px-3 py-2.5 font-mono text-xs text-navy-900 outline-none focus:border-gold-500" placeholder="https://api.example.com/v1"/></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="mb-1.5 block text-[11px] font-bold text-navy-700">اسم الموديل</label><input value={model} onChange={e=>setModel(e.target.value)} dir="ltr" className="w-full rounded-xl border border-navy-200 bg-white px-3 py-2.5 font-mono text-xs text-navy-900 outline-none focus:border-gold-500" placeholder="gemini-2.5-flash"/></div>
        <div><label className="mb-1.5 block text-[11px] font-bold text-navy-700">مفتاح API</label><input value={apiKey} onChange={e=>setApiKey(e.target.value)} type="password" dir="ltr" autoComplete="new-password" className="w-full rounded-xl border border-navy-200 bg-white px-3 py-2.5 font-mono text-xs text-navy-900 outline-none focus:border-gold-500" placeholder={configured?'اتركه فارغاً للإبقاء على المفتاح الحالي':'ضع مفتاح API هنا'}/></div>
      </div>
    </div>

    <div className="mt-4 flex flex-wrap items-center gap-3">
      <span className={'inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-extrabold '+(configured?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-800')}>
        {configured?<CheckCircle2 size={15}/>:<CircleAlert size={15}/>} {configured?'مفتاح API مضبوط':'مفتاح API غير مضبوط'}
      </span>
      <button type="button" onClick={save} disabled={busy||!baseUrl.trim()||!model.trim()} className="inline-flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-xs font-extrabold text-navy-950 disabled:opacity-45">{busy?<Loader2 size={14} className="animate-spin"/>:<Save size={14}/>}حفظ الإعدادات</button>
      <button type="button" onClick={test} disabled={testing||busy||!configured} className="inline-flex items-center gap-2 rounded-xl bg-navy-950 px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-45">{testing?<Loader2 size={14} className="animate-spin"/>:<Network size={14}/>}اختبار الاتصال</button>
    </div>
    {msg&&<p className={'mt-3 rounded-xl px-3 py-2.5 text-xs leading-6 font-bold '+(status===false?'bg-red-50 text-red-800':status===true?'bg-emerald-50 text-emerald-800':'bg-ivory-50 text-navy-700')}>{msg}</p>}
    {busy&&<p className="mt-3 text-[10px] font-semibold text-navy-300">جارٍ التحميل...</p>}
  </section>;
}
