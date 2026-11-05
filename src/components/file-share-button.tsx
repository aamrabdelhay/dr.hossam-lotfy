'use client';

import * as React from 'react';
import { Link2, Copy, Check, Loader2 } from 'lucide-react';

export function FileShareButton({resourceType,resourceId,fileId}:{resourceType:'case'|'client';resourceId:string;fileId:string}) {
  const [busy,setBusy]=React.useState(false);
  const [url,setUrl]=React.useState('');
  const [error,setError]=React.useState('');
  const [notice,setNotice]=React.useState('');
  const [expires,setExpires]=React.useState('60');
  const [maxDownloads,setMaxDownloads]=React.useState('1');

  async function create(){
    setBusy(true);setError('');setNotice('');setUrl('');
    try{
      const response=await fetch('/api/secure-file-links',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        resourceType,resourceId,fileId,expiresInMinutes:Number(expires),maxDownloads:Number(maxDownloads),
      })});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'تعذر إنشاء رابط المشاركة');
      setUrl(result.url);
      setNotice('الرابط مؤقت؛ شاركه فقط مع الشخص المقصود.');
      try{await navigator.clipboard.writeText(result.url);setNotice('تم إنشاء الرابط ونسخه.');}catch{}
    }catch(e){setError(e instanceof Error?e.message:'تعذر إنشاء رابط المشاركة');}
    finally{setBusy(false);}
  }
  async function copy(){
    try{await navigator.clipboard.writeText(url);setNotice('تم نسخ الرابط.');}
    catch{setNotice('تعذر النسخ تلقائيًا؛ حدّد الرابط وانسخه يدويًا.');}
  }

  return <div className="flex flex-wrap items-center gap-2">
    <select aria-label="مدة صلاحية الرابط" value={expires} onChange={e=>setExpires(e.target.value)} className="h-8 rounded-lg border border-navy-200 bg-white px-2 text-[10px]">
      <option value="15">15 دقيقة</option><option value="60">ساعة</option><option value="1440">24 ساعة</option><option value="10080">7 أيام</option>
    </select>
    <select aria-label="عدد مرات تحميل الرابط" value={maxDownloads} onChange={e=>setMaxDownloads(e.target.value)} className="h-8 rounded-lg border border-navy-200 bg-white px-2 text-[10px]">
      <option value="1">تحميل مرة</option><option value="3">3 مرات</option><option value="5">5 مرات</option><option value="10">10 مرات</option>
    </select>
    <button type="button" disabled={busy} onClick={()=>void create()} className="inline-flex items-center gap-1 rounded-lg border border-gold-300 bg-gold-50 px-2.5 py-2 text-[10px] font-bold text-navy-800 disabled:opacity-50">
      {busy?<Loader2 size={12} className="animate-spin"/>:<Link2 size={12}/>}مشاركة آمنة
    </button>
    {url&&<button type="button" onClick={()=>void copy()} className="inline-flex items-center gap-1 rounded-lg border border-navy-200 px-2.5 py-2 text-[10px] font-bold text-navy-700"><Copy size={12}/>نسخ الرابط</button>}
    {error&&<span role="alert" className="w-full text-[10px] text-rose-700">{error}</span>}
    {notice&&<span role="status" className="w-full text-[10px] text-emerald-700">{notice}</span>}
    {url&&<input aria-label="رابط المشاركة المؤقت" readOnly value={url} onFocus={e=>e.currentTarget.select()} className="w-full rounded-lg border border-navy-200 bg-ivory-50 px-2 py-1.5 text-[10px]" dir="ltr"/>}
  </div>;
}
