import 'server-only';
import path from 'node:path';
import PDFDocument from 'pdfkit';

const FONT = (n: string) => path.join(process.cwd(), 'assets', 'fonts', n);
/** A4 PDF with Cairo (Arabic) registered. pdfkit shapes Arabic letters but drops some spaces in RTL runs, so lines are drawn word by word. */
export function newArabicPdf() {
  const doc = new PDFDocument({ size: 'A4', margin: 40, info: { Producer: 'Loutfi Law firm' } });
  doc.registerFont('reg', FONT('Cairo_400Regular.ttf'));
  doc.registerFont('bold', FONT('Cairo_700Bold.ttf'));
  return doc;
}
const isArabic = (t: string) => /[\u0600-\u06FF]/.test(t);
/** Break text into lines that fit maxWidth. Words wrap; a single token wider than the cell is split by characters, so nothing is dropped. */
export function wrapLines(doc: PDFKit.PDFDocument, text: string, maxWidth: number, font: 'reg' | 'bold' = 'reg', size = 11): string[] {
  doc.font(font).fontSize(size);
  const out: string[] = []; let cur = '';
  const push = () => { if (cur) out.push(cur); cur = ''; };
  for (const w of String(text ?? '').split(/\s+/).filter(Boolean)) {
    let word = w;
    while (doc.widthOfString(word) > maxWidth) { // very long token: split by characters
      let k = word.length; while (k > 1 && doc.widthOfString(word.slice(0, k)) > maxWidth) k--;
      push(); out.push(word.slice(0, k)); word = word.slice(k);
    }
    const trial = cur ? cur + ' ' + word : word;
    if (doc.widthOfString(trial) <= maxWidth) cur = trial; else { push(); cur = word; }
  }
  push(); return out.length ? out : [''];
}
const AR = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
const LAT = /[A-Za-z0-9]/;
const MIRROR: Record<string, string> = { '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<' };
/** Split a line into direction runs (simplified bidi for a right-to-left paragraph): Arabic letters are RTL, Latin letters and digits are LTR, and anything else (space, dash, slash, dot, brackets) joins an LTR run only when it sits between two LTR characters, otherwise the RTL run. */
export function bidiRuns(str: string): { dir: 'L' | 'R'; text: string }[] {
  const chars = Array.from(str); const cls: ('L' | 'R' | 'N')[] = chars.map((c) => (AR.test(c) ? 'R' : LAT.test(c) ? 'L' : 'N'));
  for (let i = 0; i < chars.length; i++) {
    if (cls[i] !== 'N') continue;
    let j = i; while (j < chars.length && cls[j] === 'N') j++;
    const prev = i > 0 ? cls[i - 1] : 'R', next = j < chars.length ? cls[j] : 'R';
    const d = prev === 'L' && next === 'L' ? 'L' : 'R';
    for (let k = i; k < j; k++) cls[k] = d; i = j - 1;
  }
  const out: { dir: 'L' | 'R'; text: string }[] = [];
  chars.forEach((c, i) => { const d = cls[i] as 'L' | 'R'; const last = out[out.length - 1]; if (last && last.dir === d) last.text += c; else out.push({ dir: d, text: c }); });
  return out;
}
/** Draw one already-wrapped line ending at xRight. Latin words, references, digits and filenames keep their own left-to-right order inside the right-to-left line; Arabic letter groups are shaped by pdfkit and placed right to left, punctuation is drawn on its own and brackets are mirrored. Limit: this is a simplified bidi, not full UAX #9 (no nested embeddings). */
export function rtlLine(doc: PDFKit.PDFDocument, text: string, xRight: number, y: number, opts: { font?: 'reg' | 'bold'; size?: number } = {}) {
  doc.font(opts.font ?? 'reg').fontSize(opts.size ?? 11);
  const str = String(text ?? '').trim(); if (!str) return;
  const sp = doc.widthOfString(' ') || 3; let x = xRight;
  const w = (t: string) => (t === ' ' ? sp : doc.widthOfString(t));
  for (const run of bidiRuns(str)) {
    if (run.dir === 'L') { const rw = doc.widthOfString(run.text); doc.text(run.text, x - rw, y, { lineBreak: false }); x -= rw; continue; }
    for (const seg of run.text.match(/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]+|[\s\S]/g) ?? []) {
      const t = seg.length === 1 ? MIRROR[seg] ?? seg : seg; const sw = w(t);
      if (t !== ' ' && t !== '\u00A0') doc.text(t, x - sw, y, { lineBreak: false }); x -= sw;
    }
  }
}
/** Wrapped RTL cell. Returns the height used so a row can grow to its tallest cell. */
export function rtlCell(doc: PDFKit.PDFDocument, text: string, xRight: number, y: number, width: number, opts: { font?: 'reg' | 'bold'; size?: number } = {}) {
  const size = opts.size ?? 10, lh = size * 1.5;
  const lines = wrapLines(doc, text, width, opts.font ?? 'reg', size);
  lines.forEach((l, i) => rtlLine(doc, l, xRight, y + i * lh, { ...opts, size }));
  return lines.length * lh;
}
export function pdfToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => { const c: Buffer[] = []; doc.on('data', (b) => c.push(b)); doc.on('end', () => resolve(Buffer.concat(c))); doc.on('error', reject); doc.end(); });
}
