import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getPrivateS3ObjectForPrefix, parsePrivateS3UrlForPrefix } from '@/lib/client-file-s3';
import { newArabicPdf, pdfToBuffer, rtlLine, rtlCell } from '@/lib/pdf-rtl';

/** Cover/index page. Page numbers for the index are computed after merge, so the cover is drawn from a first pass (titles, order) and a second pass with start pages. */
export async function drawCover(args: { caseName: string; caseNumber: string; title: string; generatedBy: string; rows: { title: string; startPage?: number; pages?: number; note?: string }[] }) {
  const doc = newArabicPdf(); const R = 555;
  rtlLine(doc, 'Loutfi Law firm', R, 40, { font: 'bold', size: 14 });
  let y = 70; y += rtlCell(doc, args.title, R, y, 515, { font: 'bold', size: 16 }) + 8;
  y += rtlCell(doc, 'القضية: ' + args.caseName + (args.caseNumber ? ' - ' + args.caseNumber : ''), R, y, 515, { size: 11 }) + 4;
  y += rtlCell(doc, 'أعدها: ' + args.generatedBy + ' - ' + new Date().toISOString().slice(0, 10), R, y, 515, { size: 10 }) + 10;
  rtlLine(doc, 'الفهرس', R, y, { font: 'bold', size: 12 }); y += 22;
  args.rows.forEach((r, i) => {
    const h = rtlCell(doc, (i + 1) + '. ' + r.title + (r.note ? ' (' + r.note + ')' : ''), R - 70, y, 440, { size: 10 });
    if (r.startPage) rtlLine(doc, 'ص ' + r.startPage + (r.pages && r.pages > 1 ? '-' + (r.startPage + r.pages - 1) : ''), 70, y, { size: 10 });
    y += h + 4; if (y > 780) { doc.addPage(); y = 50; }
  });
  return new Uint8Array(await pdfToBuffer(doc));
}

/** Item 155: one A4 page with a light diagonal text, laid over every page of the bundle by mergeBundle. */
export async function drawWatermark(text: string) {
  const doc = newArabicPdf();
  doc.save(); doc.opacity(0.16); doc.rotate(-35, { origin: [297.6, 421] });
  rtlLine(doc, text, 297.6 + 200, 400, { font: 'bold', size: 44 });
  doc.restore();
  return new Uint8Array(await pdfToBuffer(doc));
}

/** Read one case file's bytes. Production reads private S3 under cases/<caseId>/. TEST SEAM: outside production only, BUNDLE_TEST_STORAGE_DIR serves files stored as fixture://cases/<caseId>/<name> from a local folder; it never runs in production and does not verify S3. */
export async function readCaseFileBytes(url: string | null, caseId: string): Promise<Uint8Array | null> {
  const prefix = `cases/${caseId}/`;
  const dir = process.env.NODE_ENV !== 'production' ? process.env.BUNDLE_TEST_STORAGE_DIR : '';
  if (dir && url?.startsWith('fixture://' + prefix)) {
    const name = path.basename(url.slice(('fixture://' + prefix).length));
    return new Uint8Array(await fs.readFile(path.join(dir, name)));
  }
  if (!parsePrivateS3UrlForPrefix(url, prefix)) return null;
  const obj = await getPrivateS3ObjectForPrefix(url!, prefix);
  return obj?.Body ? await obj.Body.transformToByteArray() : null;
}
