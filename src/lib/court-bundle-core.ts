import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export type BundlePart = { title: string; mime: string | null; bytes: Uint8Array };
export type BundleResult = { pdf: Uint8Array; included: { title: string; startPage: number; pages: number }[]; skipped: { title: string; reason: string }[] };

/** Merge parts in the given order after a cover PDF. PDFs are copied page by page, PNG/JPEG are placed one per A4 page, other types are skipped and reported (never silently dropped). Page numbers "n / N" are stamped at the bottom of every page. */
export async function mergeBundle(cover: Uint8Array, parts: BundlePart[], stamp?: Uint8Array): Promise<BundleResult> {
  const out = await PDFDocument.create();
  const coverDoc = await PDFDocument.load(cover);
  (await out.copyPages(coverDoc, coverDoc.getPageIndices())).forEach((p) => out.addPage(p));
  const included: BundleResult['included'] = []; const skipped: BundleResult['skipped'] = [];
  for (const part of parts) {
    const start = out.getPageCount() + 1;
    try {
      const mime = (part.mime || '').toLowerCase();
      if (mime === 'application/pdf' || part.bytes.subarray(0, 5).toString() === '%PDF-') {
        const src = await PDFDocument.load(part.bytes, { ignoreEncryption: false });
        (await out.copyPages(src, src.getPageIndices())).forEach((p) => out.addPage(p));
      } else if (mime === 'image/png' || mime === 'image/jpeg') {
        const img = mime === 'image/png' ? await out.embedPng(part.bytes) : await out.embedJpg(part.bytes);
        const page = out.addPage([595.28, 841.89]); const s = Math.min(515 / img.width, 740 / img.height, 1);
        page.drawImage(img, { x: (595.28 - img.width * s) / 2, y: 841.89 - 50 - img.height * s, width: img.width * s, height: img.height * s });
      } else { skipped.push({ title: part.title, reason: 'نوع الملف غير مدعوم في الحزمة: ' + (part.mime || 'unknown') }); continue; }
      included.push({ title: part.title, startPage: start, pages: out.getPageCount() - start + 1 });
    } catch { skipped.push({ title: part.title, reason: 'تعذر قراءة الملف (محمي أو تالف)' }); }
  }
  const font = await out.embedFont(StandardFonts.Helvetica); const total = out.getPageCount();
  out.getPages().forEach((p, i) => { const { width } = p.getSize(); const t = (i + 1) + ' / ' + total; p.drawText(t, { x: width / 2 - font.widthOfTextAtSize(t, 9) / 2, y: 18, size: 9, font, color: rgb(0.3, 0.3, 0.3) }); });
  if (stamp) { // item 155: a one-page PDF (drawn by the caller) is laid over every page, centred, never changing the page content underneath
    const [emb] = await out.embedPdf(await PDFDocument.load(stamp), [0]);
    out.getPages().forEach((p) => { const { width, height } = p.getSize(); const k = Math.min(width / emb.width, height / emb.height); p.drawPage(emb, { x: (width - emb.width * k) / 2, y: (height - emb.height * k) / 2, width: emb.width * k, height: emb.height * k }); });
  }
  return { pdf: await out.save(), included, skipped };
}
