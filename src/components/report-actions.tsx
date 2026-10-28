'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, FileSpreadsheet, Printer, X, Eye } from 'lucide-react';

export function ReportActions({
  reportUrl,
  excelUrl,
  compact = false,
}: {
  reportUrl: string;
  excelUrl?: string;
  compact?: boolean;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewFrame = useRef<HTMLIFrameElement>(null);
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-extrabold transition';
  const previewUrl = reportUrl + (reportUrl.includes('?') ? '&' : '?') + 'preview=1';

  useEffect(() => {
    if (!previewOpen) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [previewOpen]);

  const printPreview = () => {
    const frameWindow = previewFrame.current?.contentWindow;
    if (!frameWindow) return;
    frameWindow.focus();
    frameWindow.print();
  };

  return (
    <>
      <div className="print:hidden flex flex-wrap items-center gap-2" dir="rtl">
        <button type="button" onClick={() => setPreviewOpen(true)} className={base + ' bg-navy-950 text-white hover:bg-navy-800'} title="معاينة التقرير وتعديله قبل حفظ PDF">
          <Download size={13}/>{compact ? 'معاينة PDF' : 'حفظ PDF'}
        </button>
        <button type="button" onClick={() => setPreviewOpen(true)} className={base + ' border border-navy-200 bg-white text-navy-700 hover:border-gold-500'} title="فتح معاينة التقرير قبل الطباعة">
          <Printer size={13}/>{compact ? 'معاينة' : 'معاينة وطباعة'}
        </button>
        {excelUrl && (
          <a href={excelUrl} className={base + ' border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'} title="تحميل بيانات العميل في ملف Excel">
            <FileSpreadsheet size={13}/>{compact ? 'Excel' : 'تحميل Excel'}
          </a>
        )}
      </div>

      {previewOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-[#05080f]/75 p-2 backdrop-blur-sm sm:p-5"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPreviewOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-preview-title"
            className="flex h-[96dvh] w-full max-w-[1200px] flex-col overflow-hidden rounded-2xl border border-navy-200 bg-white shadow-2xl sm:h-[92dvh]"
            dir="rtl"
          >
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-100 bg-white px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <h2 id="report-preview-title" className="flex items-center gap-2 text-sm font-black text-navy-950">
                  <Eye size={17} className="text-gold-600" />
                  معاينة وتعديل التقرير
                </h2>
                <p className="mt-1 text-[11px] font-medium leading-5 text-navy-500">
                  اضغط على أي نص داخل المعاينة لتعديله، ثم اختر الطباعة أو حفظ PDF.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button type="button" onClick={printPreview} className="inline-flex items-center gap-2 rounded-full bg-navy-950 px-4 py-2 text-[11px] font-extrabold text-white hover:bg-navy-800">
                  <Download size={14}/> طباعة / حفظ PDF
                </button>
                <button type="button" onClick={() => setPreviewOpen(false)} aria-label="إغلاق المعاينة" className="grid h-9 w-9 place-items-center rounded-full border border-navy-200 text-navy-600 hover:bg-ivory-50">
                  <X size={17}/>
                </button>
              </div>
            </header>
            <div className="min-h-0 flex-1 bg-[#eef2f8] p-1 sm:p-3">
              <iframe
                ref={previewFrame}
                key={previewUrl}
                src={previewUrl}
                title="معاينة التقرير قبل التنزيل"
                className="h-full w-full rounded-lg border border-navy-100 bg-white"
              />
            </div>
          </section>
        </div>
      )}
    </>
  );
}
