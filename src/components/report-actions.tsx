'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, FileSpreadsheet, Printer, X, Eye, ChevronRight, ChevronLeft } from 'lucide-react';

type ReportLanguage = 'ar' | 'en' | 'fr';
type ReportFormat = 'pdf' | 'word' | 'excel';
type ReportSection = 'basic' | 'cases' | 'tasks' | 'attendance' | 'activity' | 'files' | 'developments' | 'appointments' | 'comments';
type ExportRow = { section: string; date: string; title: string; detail: string; meta: string };

const SECTION_LABELS: Record<ReportLanguage, Record<ReportSection, string>> = {
  ar: { basic: 'البيانات الأساسية', cases: 'القضايا', tasks: 'الجلسات والمهام', attendance: 'تسجيل الدخول والخروج', activity: 'الأنشطة التي تمت', files: 'ملفات العميل والمرفقات', developments: 'مستجدات القضايا والعميل', appointments: 'المواعيد', comments: 'التعليقات' },
  en: { basic: 'Basic information', cases: 'Cases', tasks: 'Sessions and tasks', attendance: 'Sign-in and sign-out', activity: 'Activity log', files: 'Client files and attachments', developments: 'Case and client developments', appointments: 'Appointments', comments: 'Comments' },
  fr: { basic: 'Informations de base', cases: 'Dossiers', tasks: 'Audiences et tâches', attendance: 'Connexions et déconnexions', activity: 'Journal des activités', files: 'Fichiers et pièces jointes du client', developments: 'Évolutions du dossier et du client', appointments: 'Rendez-vous', comments: 'Commentaires' },
};
const TYPE_SECTIONS: Record<string, ReportSection[]> = {
  client: ['basic', 'cases', 'files', 'developments', 'tasks', 'appointments'],
  case: ['basic', 'files', 'developments', 'tasks'],
  lawyer: ['basic', 'cases', 'tasks', 'attendance', 'activity', 'comments'],
  location: ['basic', 'cases', 'tasks', 'activity'],
};
const COPY: Record<ReportLanguage, Record<string, string>> = {
  ar: {
    choose: 'إعداد التقرير', intro: 'حدد لغة التقرير والبيانات والفترة والصيغة قبل المعاينة.', language: 'لغة التقرير', period: 'الفترة الزمنية', format: 'صيغة الملف', sections: 'البيانات المطلوب تضمينها', all: 'كل البيانات المتاحة', cancel: 'إلغاء', preview: 'معاينة التقرير', previewTitle: 'معاينة وتعديل التقرير', previewHelp: 'يمكنك الضغط داخل التقرير وتعديل النص قبل التنزيل. التعديلات ستُحفظ في الملف الذي تصدّره.', settings: 'تعديل الاختيارات', close: 'إغلاق', pdf: 'طباعة / حفظ PDF', word: 'تنزيل Word', excel: 'تنزيل Excel', loading: 'جارٍ تجهيز المعاينة…', noRows: 'لا توجد بيانات للعرض', downloadError: 'تعذر إنشاء ملف Excel. حاول مرة أخرى.', pdfHint: 'ستفتح نافذة الطباعة؛ اختر “حفظ بتنسيق PDF”.', row: 'م', section: 'القسم', date: 'التاريخ', title: 'البيان', detail: 'التفاصيل', meta: 'بيانات إضافية', summary: 'التقرير', reportDate: 'تاريخ إعداد التقرير', logo: 'LOUTFI LAW FIRM · EST. 1949',
    day: 'آخر يوم', week: 'آخر أسبوع', month: 'آخر شهر', sixMonths: 'آخر 6 شهور', year: 'آخر سنة', allTime: 'كل الفترة',
  },
  en: {
    choose: 'Report settings', intro: 'Choose the language, data sections, date range and file format before previewing.', language: 'Report language', period: 'Date range', format: 'File format', sections: 'Include these data sections', all: 'All available data', cancel: 'Cancel', preview: 'Preview report', previewTitle: 'Preview and edit report', previewHelp: 'Click any text in the report to edit it. Your edits will be included in the exported file.', settings: 'Change settings', close: 'Close', pdf: 'Print / Save PDF', word: 'Download Word', excel: 'Download Excel', loading: 'Preparing preview…', noRows: 'No data to display', downloadError: 'Could not create the Excel file. Please try again.', pdfHint: 'In the print dialog, choose “Save as PDF”.', row: 'No.', section: 'Section', date: 'Date', title: 'Item', detail: 'Details', meta: 'Additional information', summary: 'Report', reportDate: 'Report date', logo: 'LOUTFI LAW FIRM · EST. 1949',
    day: 'Last day', week: 'Last week', month: 'Last month', sixMonths: 'Last 6 months', year: 'Last year', allTime: 'All time',
  },
  fr: {
    choose: 'Paramètres du rapport', intro: 'Choisissez la langue, les données, la période et le format avant l’aperçu.', language: 'Langue du rapport', period: 'Période', format: 'Format du fichier', sections: 'Données à inclure', all: 'Toutes les données disponibles', cancel: 'Annuler', preview: 'Aperçu du rapport', previewTitle: 'Aperçu et modification du rapport', previewHelp: 'Cliquez sur le texte du rapport pour le modifier. Vos modifications seront incluses dans le fichier exporté.', settings: 'Modifier les options', close: 'Fermer', pdf: 'Imprimer / Enregistrer en PDF', word: 'Télécharger Word', excel: 'Télécharger Excel', loading: 'Préparation de l’aperçu…', noRows: 'Aucune donnée à afficher', downloadError: 'Impossible de créer le fichier Excel. Réessayez.', pdfHint: 'Dans la fenêtre d’impression, choisissez « Enregistrer au format PDF ».', row: 'N°', section: 'Rubrique', date: 'Date', title: 'Élément', detail: 'Détails', meta: 'Informations complémentaires', summary: 'Rapport', reportDate: 'Date du rapport', logo: 'LOUTFI LAW FIRM · EST. 1949',
    day: 'Dernier jour', week: 'Dernière semaine', month: 'Dernier mois', sixMonths: '6 derniers mois', year: 'Dernière année', allTime: 'Toute la période',
  },
};

function textOf(node: Element | null | undefined): string {
  return (node?.textContent ?? '').replace(/\s+/g, ' ').trim();
}
function safeFileName(value: string): string {
  return (value || 'report').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-').slice(0, 90) || 'report';
}
function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function makeReportRows(doc: Document, copy: Record<string, string>): { title: string; rows: ExportRow[]; logo: string | null } {
  const report = doc.querySelector('.screen-report') as HTMLElement | null;
  if (!report) throw new Error('The report preview is not ready.');
  const header = report.querySelector(':scope > header');
  const title = textOf(header?.querySelector('h1')) || 'LOUTFI REPORT';
  const name = textOf(header?.querySelector('h2'));
  const subtitle = textOf(header?.querySelector('h2')?.nextElementSibling);
  const metadataBox = header?.querySelector(':scope > div > div:last-child');
  const metadataParagraphs = metadataBox?.querySelectorAll('p');
  const dateText = metadataParagraphs ? textOf(metadataParagraphs.item(1)) : '';
  const img = report.querySelector('img') as HTMLImageElement | null;
  const logo = img?.getAttribute('src')?.startsWith('data:image/') ? img.getAttribute('src') : null;
  const rows: ExportRow[] = [];
  if (name) rows.push({ section: copy.summary, date: '', title: copy.title, detail: name, meta: '' });
  if (subtitle) rows.push({ section: copy.summary, date: '', title: copy.detail, detail: subtitle, meta: '' });
  if (dateText) rows.push({ section: copy.summary, date: dateText, title: copy.reportDate, detail: '', meta: '' });

  const children = Array.from(report.children) as HTMLElement[];
  for (const child of children) {
    if (child === header || child.tagName.toLowerCase() === 'footer') continue;
    const heading = textOf(child.querySelector(':scope > h3, :scope > div > h3')) || copy.summary;
    const articles = Array.from(child.querySelectorAll(':scope article')) as HTMLElement[];
    if (articles.length) {
      for (const article of articles) {
        const itemTitle = textOf(article.querySelector('h4')) || heading;
        const date = textOf(article.querySelector('time'));
        const paragraphs = Array.from(article.querySelectorAll('p')).map((p) => textOf(p));
        rows.push({ section: heading, date, title: itemTitle, detail: paragraphs[0] || '', meta: paragraphs.slice(1).join(' · ') });
      }
      continue;
    }
    const grid = (child.matches('.grid') ? child : child.querySelector(':scope > .grid')) as HTMLElement | null;
    if (grid) {
      for (const card of Array.from(grid.children) as HTMLElement[]) {
        const ps = Array.from(card.querySelectorAll('p')).map((p) => textOf(p));
        if (ps.length >= 2) rows.push({ section: heading, date: '', title: ps[0], detail: ps[ps.length - 1], meta: '' });
        else {
          const text = textOf(card);
          if (text) rows.push({ section: heading, date: '', title: text, detail: '', meta: '' });
        }
      }
      continue;
    }
    const list = child.querySelector(':scope > .space-y-2') as HTMLElement | null;
    if (list) {
      for (const item of Array.from(list.children) as HTMLElement[]) {
        const spans = Array.from(item.querySelectorAll('span')).map((s) => textOf(s));
        if (spans.length) rows.push({ section: heading, date: '', title: spans[0], detail: spans.slice(1).join(' · '), meta: '' });
        else {
          const value = textOf(item);
          if (value) rows.push({ section: heading, date: '', title: value, detail: '', meta: '' });
        }
      }
      continue;
    }
    const fallback = textOf(child);
    if (fallback && fallback !== heading) rows.push({ section: heading, date: '', title: fallback, detail: '', meta: '' });
  }
  return { title: [title, name].filter(Boolean).join(' - '), rows, logo };
}
function downloadBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 1500);
}

export function ReportActions({ reportUrl, excelUrl, compact = false }: { reportUrl: string; excelUrl?: string; compact?: boolean }) {
  const reportType = reportUrl.split('?')[0].split('/').filter(Boolean)[1] || 'client';
  const availableSections = TYPE_SECTIONS[reportType] || TYPE_SECTIONS.client;
  const [language, setLanguage] = useState<ReportLanguage>('ar');
  const [period, setPeriod] = useState('all');
  const [format, setFormat] = useState<ReportFormat>('pdf');
  const [sections, setSections] = useState<ReportSection[]>(availableSections);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'options' | 'preview'>('options');
  const [previewUrl, setPreviewUrl] = useState('');
  const frame = useRef<HTMLIFrameElement>(null);
  const copy = COPY[language];
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-extrabold transition';
  const periods = [
    { value: 'day', label: copy.day }, { value: 'week', label: copy.week }, { value: 'month', label: copy.month },
    { value: '6months', label: copy.sixMonths }, { value: 'year', label: copy.year }, { value: 'all', label: copy.allTime },
  ];
  useEffect(() => {
    if (!open) return;
    const before = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = before; window.removeEventListener('keydown', onKeyDown); };
  }, [open]);
  const start = (preferredFormat?: ReportFormat) => {
    if (preferredFormat) setFormat(preferredFormat);
    setStep('options');
    setOpen(true);
  };
  const beginPreview = () => {
    const url = new URL(reportUrl, window.location.origin);
    url.searchParams.set('preview', '1');
    url.searchParams.set('lang', language);
    url.searchParams.set('period', period);
    url.searchParams.set('format', format);
    url.searchParams.set('sections', sections.join(','));
    setPreviewUrl(url.pathname + url.search);
    setStep('preview');
  };
  const getDocument = () => frame.current?.contentDocument ?? null;
  const printPreview = () => {
    const win = frame.current?.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
  };
  const exportWord = () => {
    try {
      const doc = getDocument();
      if (!doc) throw new Error('Preview not ready');
      const parsed = makeReportRows(doc, copy);
      const direction = language === 'ar' ? 'rtl' : 'ltr';
      const rows = parsed.rows.map((row, i) => '<tr><td>' + (i + 1) + '</td><td>' + escapeHtml(row.section) + '</td><td>' + escapeHtml(row.date) + '</td><td><strong>' + escapeHtml(row.title) + '</strong></td><td>' + escapeHtml(row.detail) + '</td><td>' + escapeHtml(row.meta) + '</td></tr>').join('');
      const logo = parsed.logo ? '<img src="' + parsed.logo + '" alt="Loutfi" style="max-width:150px;max-height:62px;object-fit:contain" />' : '<strong style="font-size:18px;letter-spacing:2px">LOUTFI LAW FIRM</strong>';
      const html = '<!doctype html><html lang="' + language + '" dir="' + direction + '"><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;color:#18263a;font-size:10pt}h1{font-size:20pt;margin:18pt 0 5pt}p{line-height:1.6}.brand{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #18263a;padding-bottom:12pt;margin-bottom:16pt}.brandtext{font-size:9pt;color:#8a6a3a}table{width:100%;border-collapse:collapse;table-layout:fixed}th{background:#18263a;color:#fff;font-weight:bold}td,th{border:1px solid #d7dce2;padding:6pt;text-align:inherit;vertical-align:top;overflow-wrap:anywhere}tr{page-break-inside:avoid}</style></head><body dir="' + direction + '"><div class="brand"><div>' + logo + '<p class="brandtext">LOUTFI LAW FIRM · EST. 1949</p></div><div>' + escapeHtml(copy.reportDate) + ': ' + escapeHtml(new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : language === 'fr' ? 'fr-FR' : 'en-GB')) + '</div></div><h1>' + escapeHtml(parsed.title) + '</h1><table><thead><tr><th>' + escapeHtml(copy.row) + '</th><th>' + escapeHtml(copy.section) + '</th><th>' + escapeHtml(copy.date) + '</th><th>' + escapeHtml(copy.title) + '</th><th>' + escapeHtml(copy.detail) + '</th><th>' + escapeHtml(copy.meta) + '</th></tr></thead><tbody>' + rows + '</tbody></table></body></html>';
      downloadBlob(new Blob(['\uFEFF', html], { type: 'application/msword;charset=utf-8' }), safeFileName(parsed.title) + '.doc');
    } catch {
      window.alert(language === 'ar' ? 'تعذر تجهيز ملف Word من المعاينة.' : language === 'fr' ? 'Impossible de créer le document Word à partir de l’aperçu.' : 'Could not create the Word file from the preview.');
    }
  };
  const exportExcel = async () => {
    try {
      const doc = getDocument();
      if (!doc) throw new Error('Preview not ready');
      const parsed = makeReportRows(doc, copy);
      const body = {
        title: parsed.title,
        sheetName: (textOf(doc.querySelector('.screen-report h1')) || 'Report').slice(0, 31),
        language,
        logoDataUrl: parsed.logo,
        headers: [copy.row, copy.section, copy.date, copy.title, copy.detail, copy.meta],
        rows: parsed.rows.map((row, i) => [String(i + 1), row.section, row.date, row.title, row.detail, row.meta]),
      };
      const response = await fetch('/api/reports/export/xlsx', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error('Export rejected');
      const blob = await response.blob();
      downloadBlob(blob, safeFileName(parsed.title) + '.xlsx');
    } catch {
      window.alert(copy.downloadError);
    }
  };
  const exportSelected = () => {
    if (format === 'pdf') printPreview();
    else if (format === 'word') exportWord();
    else void exportExcel();
  };
  const toggleSection = (value: ReportSection) => {
    setSections((old) => old.includes(value) ? old.filter((x) => x !== value) : availableSections.filter((x) => x === value || old.includes(x)));
  };
  return (
    <>
      <div className="print:hidden flex flex-wrap items-center gap-2" dir="rtl">
        <button type="button" onClick={() => start()} className={base + ' bg-navy-950 text-white hover:bg-navy-800'} title="اختيار لغة التقرير والبيانات والفترة قبل التنزيل">
          <Download size={13}/>{compact ? 'حفظ التقرير' : 'تحميل التقرير'}
        </button>
        {excelUrl && <button type="button" onClick={() => start('excel')} className={base + ' border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'} title="تخصيص تقرير Excel قبل تحميله"><FileSpreadsheet size={13}/>{compact ? 'Excel' : 'تصدير Excel'}</button>}
      </div>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#05080f]/75 p-2 backdrop-blur-sm sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="report-preview-title" dir={language === 'ar' ? 'rtl' : 'ltr'} className="flex h-[96dvh] w-full max-w-[1200px] flex-col overflow-hidden rounded-2xl border border-navy-200 bg-white shadow-2xl sm:h-[92dvh]">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-100 bg-white px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <h2 id="report-preview-title" className="flex items-center gap-2 text-sm font-black text-navy-950">{step === 'options' ? <FileSpreadsheet size={17} className="text-gold-600"/> : <Eye size={17} className="text-gold-600"/>}{step === 'options' ? copy.choose : copy.previewTitle}</h2>
                <p className="mt-1 text-[11px] font-medium leading-5 text-navy-500">{step === 'options' ? copy.intro : copy.previewHelp}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label={copy.close} className="grid h-9 w-9 place-items-center rounded-full border border-navy-200 text-navy-600 hover:bg-ivory-50"><X size={17}/></button>
            </header>
            {step === 'options' ? (
              <>
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="block text-xs font-extrabold text-navy-700">{copy.language}
                      <select value={language} onChange={(event) => setLanguage(event.target.value as ReportLanguage)} className="mt-2 w-full rounded-xl border border-navy-200 bg-white px-3 py-2.5 text-sm font-semibold text-navy-900">
                        <option value="ar">العربية</option><option value="en">English</option><option value="fr">Français</option>
                      </select>
                    </label>
                    <label className="block text-xs font-extrabold text-navy-700">{copy.period}
                      <select value={period} onChange={(event) => setPeriod(event.target.value)} className="mt-2 w-full rounded-xl border border-navy-200 bg-white px-3 py-2.5 text-sm font-semibold text-navy-900">
                        {periods.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label className="block text-xs font-extrabold text-navy-700">{copy.format}
                      <select value={format} onChange={(event) => setFormat(event.target.value as ReportFormat)} className="mt-2 w-full rounded-xl border border-navy-200 bg-white px-3 py-2.5 text-sm font-semibold text-navy-900">
                        <option value="pdf">PDF</option><option value="word">Microsoft Word (.doc)</option><option value="excel">Microsoft Excel (.xlsx)</option>
                      </select>
                    </label>
                  </div>
                  <div>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-black text-navy-950">{copy.sections}</h3><button type="button" onClick={() => setSections((old) => old.length === availableSections.length ? [] : [...availableSections])} className="text-xs font-bold text-gold-700 underline">{sections.length === availableSections.length ? (language === 'ar' ? 'إلغاء تحديد الكل' : language === 'fr' ? 'Tout désélectionner' : 'Clear selection') : copy.all}</button></div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {availableSections.map((option) => (
                        <label key={option} className={'flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-3 text-xs font-bold ' + (sections.includes(option) ? 'border-gold-500 bg-gold-500/10 text-navy-900' : 'border-navy-100 bg-white text-navy-500')}>
                          <input type="checkbox" className="mt-0.5 accent-[#8a6a3a]" checked={sections.includes(option)} onChange={() => toggleSection(option)}/>
                          <span>{SECTION_LABELS[language][option]}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-navy-100 bg-ivory-50 px-4 py-3 sm:px-6">
                  <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-navy-200 bg-white px-4 py-2.5 text-xs font-bold text-navy-600">{copy.cancel}</button>
                  <button type="button" disabled={sections.length === 0} onClick={beginPreview} className="inline-flex items-center gap-2 rounded-full bg-navy-950 px-5 py-2.5 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40"><Eye size={15}/>{copy.preview}<ChevronLeft size={14}/></button>
                </footer>
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-navy-100 bg-ivory-50 px-4 py-2">
                  <button type="button" onClick={() => setStep('options')} className="inline-flex items-center gap-1 rounded-full border border-navy-200 bg-white px-3 py-2 text-[11px] font-bold text-navy-700"><ChevronRight size={13}/>{copy.settings}</button>
                  <button type="button" onClick={exportSelected} className="inline-flex items-center gap-2 rounded-full bg-navy-950 px-4 py-2 text-[11px] font-extrabold text-white hover:bg-navy-800">
                    {format === 'pdf' ? <Printer size={14}/> : format === 'word' ? <Download size={14}/> : <FileSpreadsheet size={14}/>}
                    {format === 'pdf' ? copy.pdf : format === 'word' ? copy.word : copy.excel}
                  </button>
                </div>
                <div className="min-h-0 flex-1 bg-[#eef2f8] p-1 sm:p-3">
                  {previewUrl ? <iframe ref={frame} key={previewUrl} src={previewUrl} title={copy.previewTitle} className="h-full w-full rounded-lg border border-navy-100 bg-white"/> : <div className="grid h-full place-items-center text-xs font-bold text-navy-500">{copy.loading}</div>}
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
