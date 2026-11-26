'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Compass, X } from 'lucide-react';

const STEPS = [
  { title: 'يومي', body: 'تظهر هنا جلسات ومهام اليوم والمهام المتأخرة، مع اختصاراتك السريعة.', href: '/my-day' },
  { title: 'الجلسات والمهام', body: 'من الصفحة الرئيسية تضيف جلسة جديدة وتتابع كل ما يخص مكتبك أو فرعك.', href: '/' },
  { title: 'القضايا', body: 'ملف كل قضية فيه الأطراف والملفات والأحداث. ما تراه يتحدد بصلاحياتك.', href: '/case-archive' },
  { title: 'التقويم', body: 'عرض الجلسات والمواعيد على التقويم.', href: '/calendar' },
  { title: 'البحث', body: 'ابحث في الجلسات والعملاء. النتائج تحترم صلاحياتك والأسوار الأخلاقية.', href: '/search' },
  { title: 'الإشعارات', body: 'التنبيهات والطلبات. تقدر تؤجل تنبيه أو تحدد أهميته.', href: '/notifications' },
];
const KEY = 'loutfi-tour-done';
export function PlatformTour() {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [done, setDone] = useState(true);
  useEffect(() => { try { setDone(localStorage.getItem(KEY) === '1'); } catch { setDone(false); } }, []);
  function finish() { try { localStorage.setItem(KEY, '1'); } catch {} setDone(true); setOpen(false); setI(0); }
  const s = STEPS[i];
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="no-print inline-flex items-center gap-2 rounded-lg border border-navy-200 bg-white px-3 py-2 text-xs font-extrabold text-navy-800">
        <Compass size={14} />{done ? 'إعادة الجولة التعريفية' : 'ابدأ الجولة التعريفية'}
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="الجولة التعريفية" className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold text-navy-400">الخطوة {i + 1} من {STEPS.length}</p>
              <button type="button" aria-label="إغلاق" onClick={finish}><X size={16} /></button>
            </div>
            <h3 className="mb-1 text-lg font-extrabold text-navy-950">{s.title}</h3>
            <p className="mb-4 text-sm font-semibold leading-7 text-navy-700">{s.body}</p>
            <div className="flex items-center justify-between gap-2">
              <Link href={s.href} onClick={() => setOpen(false)} className="text-xs font-extrabold text-gold-700 underline">افتح هذه الصفحة</Link>
              <div className="flex gap-2">
                <button type="button" disabled={i === 0} onClick={() => setI(i - 1)} className="rounded-lg border border-navy-200 px-3 py-2 text-xs font-extrabold disabled:opacity-40">السابق</button>
                {i < STEPS.length - 1
                  ? <button type="button" onClick={() => setI(i + 1)} className="rounded-lg bg-navy-950 px-3 py-2 text-xs font-extrabold text-white">التالي</button>
                  : <button type="button" onClick={finish} className="rounded-lg bg-navy-950 px-3 py-2 text-xs font-extrabold text-white">إنهاء</button>}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
