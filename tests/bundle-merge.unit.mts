import { PDFDocument } from 'pdf-lib';
import { mergeBundle } from '../src/lib/court-bundle-core.ts';
let fail = 0; const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
const mk = async (n: number) => { const d = await PDFDocument.create(); for (let i = 0; i < n; i++) d.addPage([595, 842]); return d.save(); };
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const r = await mergeBundle(await mk(1), [
  { title: 'a.pdf', mime: 'application/pdf', bytes: await mk(3) },
  { title: 'img.png', mime: 'image/png', bytes: png },
  { title: 'doc.docx', mime: 'application/msword', bytes: new Uint8Array([1, 2, 3]) },
  { title: 'bad.pdf', mime: 'application/pdf', bytes: new Uint8Array([1, 2, 3]) },
  { title: 'b.pdf', mime: 'application/pdf', bytes: await mk(2) },
]);
const out = await PDFDocument.load(r.pdf);
ok(out.getPageCount() === 1 + 3 + 1 + 2, 'cover + 3 + image + 2 = 7 pages (got ' + out.getPageCount() + ')');
ok(r.included.map((x) => x.title + '@' + x.startPage).join() === 'a.pdf@2,img.png@5,b.pdf@6', 'order and start pages kept: ' + r.included.map((x) => x.title + '@' + x.startPage).join());
ok(r.skipped.length === 2 && r.skipped.some((s) => s.title === 'doc.docx') && r.skipped.some((s) => s.title === 'bad.pdf'), 'unsupported and unreadable files are reported, not dropped silently');
process.exit(fail ? 1 : 0);
