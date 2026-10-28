'use client';

import { useState } from 'react';
import { ChevronDown, Download, FileSpreadsheet, FileText, LoaderCircle, Printer } from 'lucide-react';
import { exportReport, type ReportData, type ReportFormat, type ReportLanguage } from '@/lib/exportReport';
import { toastError, toastSuccess } from '@/components/toasts';

type ExportMenuProps = {
  title: string;
  filename?: string;
  language?: ReportLanguage;
  selectedFormat?: ReportFormat;
  onFormatChange?: (format: ReportFormat) => void;
  getReportData: () => ReportData;
  onPdfExport?: (filename: string) => void;
  compact?: boolean;
};

const LABELS: Record<ReportLanguage, { export: string; pdf: string; word: string; excel: string; busy: string }> = {
  ar: { export: 'تصدير', pdf: 'PDF', word: 'Word (.docx)', excel: 'Excel (.xlsx)', busy: 'جارٍ إنشاء الملف…' },
  en: { export: 'Export', pdf: 'PDF', word: 'Word (.docx)', excel: 'Excel (.xlsx)', busy: 'Generating file…' },
  fr: { export: 'Exporter', pdf: 'PDF', word: 'Word (.docx)', excel: 'Excel (.xlsx)', busy: 'Création du fichier…' },
};

const ERROR_PREFIX: Record<ReportLanguage, string> = {
  ar: 'تعذر تصدير التقرير: ',
  en: 'Report export failed: ',
  fr: 'Échec de l’exportation du rapport : ',
};

const SUCCESS: Record<ReportLanguage, Record<ReportFormat, string>> = {
  ar: { pdf: 'تم فتح نافذة الطباعة؛ اختر «حفظ بتنسيق PDF».', word: 'تم إنشاء ملف Word وتنزيله.', excel: 'تم إنشاء ملف Excel وتنزيله.' },
  en: { pdf: 'Print dialog opened; choose “Save as PDF”.', word: 'The Word file was created and downloaded.', excel: 'The Excel file was created and downloaded.' },
  fr: { pdf: 'La fenêtre d’impression est ouverte ; choisissez « Enregistrer en PDF ».', word: 'Le fichier Word a été créé et téléchargé.', excel: 'Le fichier Excel a été créé et téléchargé.' },
};

export function ExportMenu({
  title,
  filename,
  language = 'ar',
  selectedFormat = 'pdf',
  onFormatChange,
  getReportData,
  onPdfExport,
  compact = false,
}: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<ReportFormat | null>(null);
  const labels = LABELS[language];

  const runExport = async (format: ReportFormat) => {
    if (loading) return;
    setLoading(format);
    setOpen(false);
    onFormatChange?.(format);
    try {
      const data = getReportData();
      await exportReport({
        ...data,
        format,
        title: data.title || title,
        filename: filename || data.title || title,
        language,
        onPdfExport,
      });
      toastSuccess(SUCCESS[language][format]);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      toastError(ERROR_PREFIX[language] + message);
    } finally {
      setLoading(null);
    }
  };

  const optionClass = (format: ReportFormat) =>
    'flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-start text-[11px] font-extrabold transition ' +
    (selectedFormat === format ? 'bg-ivory-100 text-navy-950' : 'text-navy-700 hover:bg-ivory-50') +
    (loading ? ' cursor-not-allowed opacity-50' : '');

  return (
    <div className="relative inline-flex" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={loading !== null}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full bg-navy-950 px-4 py-2 text-[11px] font-extrabold text-white transition hover:bg-navy-800 disabled:cursor-wait disabled:opacity-70"
      >
        {loading ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />}
        {loading ? labels.busy : labels.export}
        {!compact && !loading && <ChevronDown size={14} />}
      </button>
      {open && (
        <div role="menu" className="absolute end-0 top-full z-30 mt-2 min-w-44 rounded-2xl border border-navy-100 bg-white p-1.5 shadow-xl">
          <button role="menuitem" type="button" disabled={loading !== null} className={optionClass('pdf')} onClick={() => void runExport('pdf')}>
            <Printer size={14} />{labels.pdf}
          </button>
          <button role="menuitem" type="button" disabled={loading !== null} className={optionClass('word')} onClick={() => void runExport('word')}>
            <FileText size={14} />{labels.word}
          </button>
          <button role="menuitem" type="button" disabled={loading !== null} className={optionClass('excel')} onClick={() => void runExport('excel')}>
            <FileSpreadsheet size={14} />{labels.excel}
          </button>
        </div>
      )}
    </div>
  );
}
