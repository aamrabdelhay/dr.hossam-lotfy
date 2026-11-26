'use client';
import { useMemo, useState } from 'react';
import { diffStats, diffText } from '@/lib/text-diff';

/** Item 149: compare two versions of a contract or document. Paste or type text; nothing is uploaded or stored. Comparing scanned PDFs needs OCR (not configured). */
export function TextCompare() {
  const [a, setA] = useState(''); const [b, setB] = useState(''); const [go, setGo] = useState(false);
  const res = useMemo(() => { if (!go) return null; try { const p = diffText(a, b); return { p, s: diffStats(p), err: '' }; } catch (e) { return { p: [], s: null, err: (e as Error).message }; } }, [go, a, b]);
  return (
    <div className="mx-auto max-w-[1100px] space-y-3 px-4 py-6 text-xs">
      <h1 className="text-base font-extrabold text-navy-950">مقارنة نسختين من نص مستند أو عقد</h1>
      <p className="text-navy-400">الصق النص القديم والجديد. المقارنة تتم داخل المتصفح ولا يتم رفع أي شيء. مقارنة ملفات PDF الممسوحة تحتاج OCR وهو غير مفعّل.</p>
      <div className="grid gap-3 md:grid-cols-2">
        <textarea aria-label="النص القديم" dir="auto" rows={8} value={a} onChange={(e) => { setA(e.target.value); setGo(false); }} className="rounded-lg border p-2" placeholder="النص القديم" />
        <textarea aria-label="النص الجديد" dir="auto" rows={8} value={b} onChange={(e) => { setB(e.target.value); setGo(false); }} className="rounded-lg border p-2" placeholder="النص الجديد" />
      </div>
      <button type="button" disabled={!a.trim() && !b.trim()} onClick={() => setGo(true)} className="rounded-lg bg-navy-950 px-3 py-2 font-extrabold text-white disabled:opacity-40">قارن</button>
      {res?.err && <p role="alert" className="font-bold text-red-700">{res.err}</p>}
      {res?.s && (<>
        <p role="status">أُضيف {res.s.added} كلمة · حُذف {res.s.removed} كلمة · لم يتغير {res.s.unchanged} كلمة</p>
        <div aria-label="نتيجة المقارنة" dir="auto" className="whitespace-pre-wrap rounded-lg border bg-white p-3 text-sm leading-7">
          {res.p.map((d, i) => d.op === 'same' ? <span key={i}>{d.text}</span> : d.op === 'add' ? <ins key={i} className="bg-green-100 text-green-900 no-underline">{d.text}</ins> : <del key={i} className="bg-red-100 text-red-800">{d.text}</del>)}
        </div>
      </>)}
    </div>
  );
}
