'use client';
import { useCallback, useEffect, useState } from 'react';

type L = 'ar' | 'en' | 'fr';
type E = { id: string; source_lang: L; target_lang: L; source_text: string; target_text: string; source_ref: string | null };
const box = 'rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm';
const LANGS: L[] = ['ar', 'en', 'fr'];
/** Item 162: legal term pairs (Arabic, English, French) entered by people. A lookup list, not machine translation. Writing is limited by the server to senior management and office managers. */
export function TranslationMemoryPanel() {
  const [q, setQ] = useState(''); const [items, setItems] = useState<E[]>([]); const [sl, setSl] = useState<L>('ar'); const [tl, setTl] = useState<L>('en');
  const [src, setSrc] = useState(''); const [tgt, setTgt] = useState(''); const [ref, setRef] = useState(''); const [msg, setMsg] = useState('');
  const load = useCallback(async () => { const r = await fetch('/api/translation-memory?q=' + encodeURIComponent(q)); setItems(r.ok ? (await r.json()).entries : []); }, [q]);
  useEffect(() => { void load(); }, [load]);
  async function add() { setMsg(''); const r = await fetch('/api/translation-memory', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sourceLang: sl, targetLang: tl, sourceText: src, targetText: tgt, ...(ref ? { sourceRef: ref } : {}) }) }); if (r.ok) { setSrc(''); setTgt(''); setRef(''); await load(); } else setMsg((await r.json().catch(() => ({}))).error ?? 'تعذر الحفظ'); }
  return (
    <section aria-label="ذاكرة الترجمة القانونية" className="mx-auto mt-6 max-w-[1100px] rounded-2xl border border-navy-100 bg-white p-4 text-xs">
      <h2 className="mb-2 text-sm font-extrabold text-navy-950">ذاكرة الترجمة القانونية</h2>
      <p className="mb-2 text-navy-400">قائمة مصطلحات يدخلها المكتب. ليست ترجمة آلية. راجع المصطلح قبل استخدامه في مستند.</p>
      <input aria-label="بحث في المصطلحات" placeholder="بحث" value={q} onChange={(e) => setQ(e.target.value)} className={box + ' mb-3'} />
      {msg && <p role="status" className="mb-2 font-bold text-red-700">{msg}</p>}
      <div className="mb-3 flex flex-wrap gap-2">
        <select aria-label="لغة المصطلح" value={sl} onChange={(e) => setSl(e.target.value as L)} className={box}>{LANGS.map((x) => <option key={x}>{x}</option>)}</select>
        <input aria-label="المصطلح" placeholder="المصطلح" value={src} onChange={(e) => setSrc(e.target.value)} className={box} />
        <select aria-label="لغة المقابل" value={tl} onChange={(e) => setTl(e.target.value as L)} className={box}>{LANGS.map((x) => <option key={x}>{x}</option>)}</select>
        <input aria-label="المقابل" placeholder="المقابل" value={tgt} onChange={(e) => setTgt(e.target.value)} className={box} />
        <input aria-label="المرجع" placeholder="مرجع (اختياري)" value={ref} onChange={(e) => setRef(e.target.value)} className={box} />
        <button type="button" disabled={!src.trim() || !tgt.trim() || sl === tl} onClick={add} className="rounded-lg bg-navy-950 px-3 py-2 font-extrabold text-white disabled:opacity-40">إضافة مصطلح</button>
      </div>
      {items.length === 0 ? <p className="text-navy-400">لا توجد مصطلحات.</p> : <ul className="divide-y divide-navy-100">{items.map((e) => <li key={e.id} className="py-1.5"><b dir="auto">{e.source_text}</b> ({e.source_lang}) ← <span dir="auto">{e.target_text}</span> ({e.target_lang}){e.source_ref ? <span className="text-navy-400"> · {e.source_ref}</span> : null}</li>)}</ul>}
    </section>
  );
}
