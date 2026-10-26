import { Scale } from 'lucide-react';

export default function Loading() {
  return (
    <main dir="rtl" aria-busy="true" aria-label="تحميل الصفحة" role="status" className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-navy-100 bg-white/90 p-4 shadow-sm">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-950 text-gold-400"><Scale size={20}/></span>
        <div className="min-w-0 flex-1">
          <div className="h-3 w-36 animate-pulse rounded bg-navy-100"/>
          <div className="mt-2 h-2 w-56 max-w-full animate-pulse rounded bg-navy-50"/>
        </div>
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-navy-100 border-t-gold-500" aria-hidden="true"/>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({length:6},(_,i)=><div key={i} className="rounded-2xl border border-navy-100 bg-white p-5">
          <div className="h-3 w-2/3 animate-pulse rounded bg-navy-100"/>
          <div className="mt-3 h-2 w-full animate-pulse rounded bg-navy-50"/>
          <div className="mt-2 h-2 w-4/5 animate-pulse rounded bg-navy-50"/>
          <div className="mt-5 h-8 w-24 animate-pulse rounded-xl bg-ivory-100"/>
        </div>)}
      </div>
    </main>
  );
}
