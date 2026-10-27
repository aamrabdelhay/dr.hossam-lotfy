'use client';

import { Download, FileSpreadsheet, Printer } from 'lucide-react';

export function ReportActions({
  reportUrl,
  excelUrl,
  compact = false,
}: {
  reportUrl: string;
  excelUrl?: string;
  compact?: boolean;
}) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-extrabold transition';
  return (
    <div className="print:hidden flex flex-wrap items-center gap-2" dir="rtl">
      <a href={reportUrl + '?print=1'} target="_blank" rel="noreferrer" className={base + ' bg-navy-950 text-white hover:bg-navy-800'} title="فتح التقرير المنظم وحفظه PDF من نافذة الطباعة">
        <Download size={13}/>{compact ? 'PDF' : 'حفظ PDF'}
      </a>
      <button type="button" onClick={() => window.open(reportUrl + '?print=1', '_blank', 'noopener,noreferrer')} className={base + ' border border-navy-200 bg-white text-navy-700 hover:border-gold-500'} title="طباعة الصفحة مباشرة">
        <Printer size={13}/>{compact ? 'طباعة' : 'طباعة مباشرة'}
      </button>
      {excelUrl && (
        <a href={excelUrl} className={base + ' border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'} title="تحميل بيانات العميل في ملف Excel">
          <FileSpreadsheet size={13}/>{compact ? 'Excel' : 'تحميل Excel'}
        </a>
      )}
    </div>
  );
}
