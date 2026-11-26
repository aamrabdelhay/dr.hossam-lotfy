'use client';
import { useEffect, useRef, useState } from 'react';

type Box = { x: number; y: number; w: number; h: number };
type Page = { src: HTMLCanvasElement; boxes: Box[] };
/** Item 154: browser-side redaction of an IMAGE or a PDF. Black boxes are burned into pixels. A PDF is re-rendered page by page and exported as a NEW image-only PDF (no text layer, no original objects, no metadata copied), so nothing remains under the boxes. The original file is untouched. The result must still be uploaded through the normal case files upload so permissions and audit apply. */
export function ImageRedactor() {
  const cv = useRef<HTMLCanvasElement>(null);
  const [pages, setPages] = useState<Page[]>([]); const [cur, setCur] = useState(0); const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [msg, setMsg] = useState(''); const [name, setName] = useState(''); const [isPdf, setIsPdf] = useState(false); const [tick, setTick] = useState(0);
  function paint(extra?: Box) {
    const c = cv.current, p = pages[cur]; if (!c || !p) return; c.width = p.src.width; c.height = p.src.height;
    const g = c.getContext('2d'); if (!g) return; g.drawImage(p.src, 0, 0); g.fillStyle = '#000';
    for (const b of extra ? [...p.boxes, extra] : p.boxes) g.fillRect(b.x, b.y, b.w, b.h);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { paint(); }, [pages, cur, tick]);
  function pos(e: React.PointerEvent) { const c = cv.current!; const r = c.getBoundingClientRect(); return { x: ((e.clientX - r.left) * c.width) / r.width, y: ((e.clientY - r.top) * c.height) / r.height }; }
  function rect(a: { x: number; y: number }, p: { x: number; y: number }): Box { return { x: Math.min(a.x, p.x), y: Math.min(a.y, p.y), w: Math.abs(a.x - p.x), h: Math.abs(a.y - p.y) }; }
  async function onFile(f: File | undefined) {
    setMsg(''); setPages([]); setCur(0); if (!f) return; setName(f.name.replace(/\.[^.]+$/, ''));
    try {
      if (f.type === 'application/pdf') {
        if (f.size > 25 * 1024 * 1024) { setMsg('الملف أكبر من 25 ميجابايت'); return; }
        setMsg('جاري تجهيز صفحات الملف...'); setIsPdf(true);
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
        const doc = await pdfjs.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise;
        if (doc.numPages > 60) { setMsg('الحد الأقصى 60 صفحة'); return; }
        const out: Page[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const pg = await doc.getPage(i); const vp = pg.getViewport({ scale: 1.5 }); const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
          await pg.render({ canvas: c, canvasContext: c.getContext('2d')!, viewport: vp }).promise; out.push({ src: c, boxes: [] });
        }
        setPages(out); setMsg(`تم تجهيز ${out.length} صفحة. ارسم المربعات على كل صفحة تحتاج إخفاء.`);
      } else if (/^image\/(png|jpeg|webp)$/.test(f.type)) {
        setIsPdf(false);
        const bmp = await createImageBitmap(f); const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height; c.getContext('2d')!.drawImage(bmp, 0, 0);
        setPages([{ src: c, boxes: [] }]);
      } else setMsg('الصور (PNG أو JPEG أو WEBP) أو ملف PDF فقط.');
    } catch { setMsg('تعذر قراءة الملف'); }
  }
  function flat(p: Page): HTMLCanvasElement { const c = document.createElement('canvas'); c.width = p.src.width; c.height = p.src.height; const g = c.getContext('2d')!; g.drawImage(p.src, 0, 0); g.fillStyle = '#000'; for (const b of p.boxes) g.fillRect(b.x, b.y, b.w, b.h); return c; }
  const blobOf = (c: HTMLCanvasElement) => new Promise<Blob>((r, j) => c.toBlob((b) => (b ? r(b) : j(new Error('blob'))), 'image/png'));
  function save(bl: Blob, fname: string) { const a = document.createElement('a'); a.href = URL.createObjectURL(bl); a.download = fname; a.click(); }
  async function exportFile() {
    if (pages.length === 0) return; const n = pages.reduce((k, p) => k + p.boxes.length, 0);
    if (n === 0) { setMsg('ارسم مربعًا واحدًا على الأقل قبل التصدير'); return; }
    try {
      if (!isPdf) { save(await blobOf(flat(pages[0])), `${name || 'image'}-redacted.png`); }
      else {
        const { PDFDocument } = await import('pdf-lib'); const out = await PDFDocument.create();
        for (const p of pages) { const bytes = new Uint8Array(await (await blobOf(flat(p))).arrayBuffer()); const im = await out.embedPng(bytes); const pg = out.addPage([p.src.width * 0.5, p.src.height * 0.5]); pg.drawImage(im, { x: 0, y: 0, width: pg.getWidth(), height: pg.getHeight() }); }
        out.setTitle(''); out.setAuthor(''); out.setProducer(''); out.setCreator('');
        save(new Blob([new Uint8Array(await out.save())], { type: 'application/pdf' }), `${name || 'file'}-redacted.pdf`);
      }
      setMsg(`تم تصدير نسخة جديدة بها ${n} مربع إخفاء${isPdf ? ' (ملف PDF صور فقط بدون طبقة نصية)' : ''}. ارفعها من ملفات القضية. الأصل لم يتغير.`);
    } catch { setMsg('تعذر التصدير'); }
  }
  const p = pages[cur];
  return (
    <div className="mx-auto max-w-[1100px] space-y-3 px-4 py-6 text-xs">
      <h1 className="text-base font-extrabold text-navy-950">إخفاء البيانات الحساسة في صورة أو ملف PDF</h1>
      <p className="text-navy-400">اختر صورة أو ملف PDF ثم اسحب لرسم مربعات سوداء فوق البيانات. التصدير ينتج ملفًا جديدًا مسطحًا من الصور (ملف PDF الناتج بدون نص قابل للتحديد أو البحث) والأصل لا يتغير. يتم كل شيء داخل المتصفح. لرفع النتيجة استخدم ملفات القضية العادية.</p>
      <input type="file" aria-label="اختر ملفًا" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(e) => void onFile(e.target.files?.[0])} />
      {pages.length > 1 && <div className="flex items-center gap-2"><button type="button" disabled={cur === 0} onClick={() => setCur(cur - 1)} className="rounded border px-2 py-1 disabled:opacity-40">السابقة</button><span aria-label="رقم الصفحة">صفحة {cur + 1} من {pages.length}</span><button type="button" disabled={cur >= pages.length - 1} onClick={() => setCur(cur + 1)} className="rounded border px-2 py-1 disabled:opacity-40">التالية</button></div>}
      <div className="max-w-full overflow-auto rounded-lg border bg-white">
        <canvas ref={cv} aria-label="لوحة الإخفاء" className="max-w-full touch-none" style={{ cursor: 'crosshair' }}
          onPointerDown={(e) => { if (!p) return; (e.target as Element).setPointerCapture(e.pointerId); setDrag(pos(e)); }}
          onPointerMove={(e) => { if (drag) paint(rect(drag, pos(e))); }}
          onPointerUp={(e) => { if (!drag || !p) return; const b = rect(drag, pos(e)); setDrag(null); if (b.w > 3 && b.h > 3) { p.boxes.push(b); } setTick((t) => t + 1); }} />
      </div>
      <div className="flex gap-2">
        <button type="button" disabled={!p || p.boxes.length === 0} onClick={() => { p.boxes.pop(); setTick((t) => t + 1); }} className="rounded-lg border px-3 py-2 font-bold disabled:opacity-40">تراجع عن آخر مربع</button>
        <button type="button" onClick={() => void exportFile()} className="rounded-lg bg-navy-950 px-3 py-2 font-extrabold text-white">تصدير النسخة المخفية</button>
      </div>
      {msg && <p role="status" className="font-bold">{msg}</p>}
    </div>
  );
}
