'use client';
import * as React from 'react';
import {usePathname,useRouter} from 'next/navigation';
import {ArrowRight,Loader2} from 'lucide-react';
export function GlobalNavigationChrome(){
 const pathname=usePathname(); const router=useRouter(); const [loading,setLoading]=React.useState(false);
 React.useEffect(()=>{const onClick=(event:MouseEvent)=>{if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;const el=(event.target as HTMLElement|null)?.closest('a[href]') as HTMLAnchorElement|null;if(!el||el.target==='_blank')return;const url=new URL(el.href,window.location.href);if(url.origin===window.location.origin&&url.pathname!==window.location.pathname)setLoading(true)};document.addEventListener('click',onClick,true);return()=>document.removeEventListener('click',onClick,true)},[]);
 React.useEffect(()=>{setLoading(false)},[pathname]);
 return <><button type="button" onClick={()=>window.history.length>1?router.back():router.push('/')} className="fixed start-3 top-[78px] z-40 inline-flex items-center gap-1.5 rounded-full border border-navy-200 bg-white/95 px-3 py-2 text-[10px] font-extrabold text-navy-700 shadow-sm backdrop-blur sm:start-5 sm:top-[86px]"><ArrowRight size={13}/>رجوع</button>{loading&&<div className="fixed inset-0 z-[100] grid place-items-center bg-[#07101d]/95 text-white" role="status"><div className="flex flex-col items-center gap-3"><div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/10 text-lg font-black text-gold-400">LL</div><Loader2 size={20} className="animate-spin text-gold-400"/><span className="text-[11px] font-bold text-white/70">جاري التحميل…</span></div></div>}</>;
}