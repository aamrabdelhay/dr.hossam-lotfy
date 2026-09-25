'use client';
import * as React from 'react';
import {usePathname} from 'next/navigation';
import {Loader2} from 'lucide-react';

export function GlobalNavigationChrome(){
 const pathname=usePathname();
 const [loading,setLoading]=React.useState(false);
 React.useEffect(()=>{
  const onClick=(event:MouseEvent)=>{
   if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   const el=(event.target as HTMLElement|null)?.closest('a[href]') as HTMLAnchorElement|null;
   if(!el||el.target==='_blank')return;
   const url=new URL(el.href,window.location.href);
   if(url.origin===window.location.origin&&url.pathname!==window.location.pathname)setLoading(true);
  };
  document.addEventListener('click',onClick,true);
  return()=>document.removeEventListener('click',onClick,true);
 },[]);
 React.useEffect(()=>{setLoading(false)},[pathname]);
 return loading?<div className="fixed inset-0 z-[100] grid place-items-center bg-[#07101d]/95 text-white" role="status"><div className="flex flex-col items-center gap-3"><div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/10 text-lg font-black text-gold-400">LL</div><Loader2 size={20} className="animate-spin text-gold-400"/><span className="text-[11px] font-bold text-white/70">جاري التحميل…</span></div></div>:null;
}