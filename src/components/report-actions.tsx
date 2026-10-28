'use client';

import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, FileText, Printer, X } from 'lucide-react';

type ReportLanguage = 'ar' | 'en' | 'fr';
type ReportFormat = 'pdf' | 'doc' | 'xls';
type ReportPeriod = 'day' | 'week' | 'month' | '6months' | 'year' | 'all';

const translations = {
  ar: { title: 'إعداد التقرير', language: 'لغة التقرير', data: 'البيانات المطلوبة', period: 'الفترة الزمنية', format: 'صيغة الملف', basic: 'البيانات الأساسية', cases: 'القضايا المرتبطة', tasks: 'الجلسات والمهام والأنشطة', events: 'مستجدات القضية وسجلها', files: 'ملفات العميل المرفقة', activity: 'سجل الأنشطة وتسجيل الدخول', day: 'آخر يوم', week: 'آخر أسبوع', month: 'آخر شهر', six: 'آخر 6 شهور', year: 'آخر سنة', all: 'كل المدة', pdf: 'PDF', doc: 'Word', xls: 'Excel', cancel: 'إلغاء', download: 'إنشاء وتنزيل التقرير', print: 'معاينة للطباعة', choose: 'اختار البيانات التي تحتاجها. سيتم تطبيق اللغة والفترة على محتوى الملف.', noData: 'بعض الأقسام تظهر فقط إذا كانت لها بيانات مرتبطة بهذا الملف.' },
  en: { title: 'Configure report', language: 'Report language', data: 'Include data', period: 'Time range', format: 'File format', basic: 'Basic information', cases: 'Related cases', tasks: 'Sessions, tasks and activities', events: 'Case developments and timeline', files: 'Attached client files', activity: 'Activity and sign-in log', day: 'Last day', week: 'Last week', month: 'Last month', six: 'Last 6 months', year: 'Last year', all: 'All time', pdf: 'PDF', doc: 'Word', xls: 'Excel', cancel: 'Cancel', download: 'Generate and download', print: 'Print preview', choose: 'Choose the data you need. Language and date range apply to the exported content.', noData: 'Sections appear only when data is available for this record.' },
  fr: { title: 'Configurer le rapport', language: 'Langue du rapport', data: 'Données à inclure', period: 'Période', format: 'Format du fichier', basic: 'Informations principales', cases: 'Dossiers associés', tasks: 'Séances, tâches et activités', events: 'Évolutions et historique du dossier', files: 'Fichiers du client', activity: 'Activités et connexions', day: 'Dernier jour', week: 'Dernière semaine', month: 'Dernier mois', six: '6 derniers mois', year: 'Dernière année', all: 'Toute la période', pdf: 'PDF', doc: 'Word', xls: 'Excel', cancel: 'Annuler', download: 'Créer et télécharger', print: 'Aperçu avant impression', choose: 'Choisissez les données à inclure. La langue et la période s’appliquent au contenu exporté.', noData: 'Les sections ne s’affichent que si des données sont disponibles.' },
} as const;

export function ReportActions({ reportUrl, excelUrl, compact = false }: { reportUrl: string; excelUrl?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<ReportLanguage>('ar');
  const [format, setFormat] = useState<ReportFormat>('pdf');
  const [period, setPeriod] = useState<ReportPeriod>('all');
  const [sections, setSections] = useState<string[]>(['basic', 'cases', 'tasks', 'events', 'files', 'activity']);
  const cleanReportUrl = reportUrl.split('?')[0];
  const apiUrl = cleanReportUrl.replace('/reports/', '/api/reports/');
  const labels = translations[language];
  const direction = language === 'ar' ? 'rtl' : 'ltr';
  const periodOptions = useMemo(() => [
    ['day', labels.day], ['week', labels.week], ['month', labels.month], ['6months', labels.six], ['year', labels.year], ['all', labels.all],
  ] as const, [labels]);
  const dataOptions = [
    ['basic', labels.basic], ['cases', labels.cases], ['tasks', labels.tasks], ['events', labels.events], ['files', labels.files], ['activity', labels.activity],
  ] as const;
  function toggleSection(key: string) {
    setSections(current => current.includes(key) ? current.filter(item => item !== key) : [...current, key]);
  }
  function buildUrl(selectedFormat: ReportFormat) {
    const params = new URLSearchParams({ lang: language, period, sections: sections.join(',') });
    return apiUrl + '/pdf?' + params.toString().replace(/(^|&)format=[^&]*/g, '$1') + '&format=' + selectedFormat;
  }
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-extrabold transition';
  return (
    <>
      <div className="print:hidden flex flex-wrap items-center gap-2" dir="rtl">
        <button type="button" onClick={() => setOpen(true)} className={base + ' bg-navy-950 text-white hover:bg-navy-800'} title="إعداد وتنزيل تقرير مخصص">
          <Download size={13}/>{compact ? 'تحميل التقرير' : 'حفظ التقرير'}
        </button>
        <button type="button" onClick={() => { setFormat('pdf'); setOpen(true); }} className={base + ' border border-navy-200 bg-white text-navy-700 hover:border-gold-500'}>
          <Printer size={13}/>{compact ? 'طباعة' : 'معاينة للطباعة'}
        </button>
        {excelUrl && <a href={excelUrl} className={base + ' border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'} title="تصدير Excel سريع"><FileSpreadsheet size={13}/>{compact ? 'Excel' : 'Excel سريع'}</a>}
      </div>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="report-config-title" dir={direction}>
          <div className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><h2 id="report-config-title" className="text-lg font-black text-slate-900">{labels.title}</h2><p className="mt-1 text-xs text-slate-500">{labels.choose}</p></div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={18}/></button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <fieldset className="rounded-xl border border-slate-200 p-3">
                <legend className="px-1 text-sm font-bold text-slate-800">{labels.language}</legend>
                <div className="grid grid-cols-3 gap-2">
                  {([['ar','العربية'],['en','English'],['fr','Français']] as const).map(([value,label]) => <button key={value} type="button" onClick={() => setLanguage(value)} className={'rounded-lg border px-2 py-2 text-sm font-semibold ' + (language === value ? 'border-navy-900 bg-navy-950 text-white' : 'border-slate-200 text-slate-700')}>{label}</button>)}
                </div>
              </fieldset>
              <fieldset className="rounded-xl border border-slate-200 p-3">
                <legend className="px-1 text-sm font-bold text-slate-800">{labels.period}</legend>
                <select value={period} onChange={e => setPeriod(e.target.value as ReportPeriod)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800">
                  {periodOptions.map(([value,label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </fieldset>
            </div>
            <fieldset className="mt-4 rounded-xl border border-slate-200 p-3">
              <legend className="px-1 text-sm font-bold text-slate-800">{labels.data}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {dataOptions.map(([key,label]) => <label key={key} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-100 p-3 text-sm text-slate-700 hover:bg-slate-50">
                  <input type="checkbox" checked={sections.includes(key)} onChange={() => toggleSection(key)} className="mt-0.5 accent-slate-900"/><span>{label}</span>
                </label>)}
              </div>
              <p className="mt-2 text-xs text-slate-500">{labels.noData}</p>
            </fieldset>
            <fieldset className="mt-4 rounded-xl border border-slate-200 p-3">
              <legend className="px-1 text-sm font-bold text-slate-800">{labels.format}</legend>
              <div className="grid grid-cols-3 gap-2">
                {([['pdf',labels.pdf,Download],['doc',labels.doc,FileText],['xls',labels.xls,FileSpreadsheet]] as const).map(([value,label,Icon]) => <button key={value} type="button" onClick={() => setFormat(value)} className={'flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold ' + (format === value ? 'border-navy-900 bg-navy-950 text-white' : 'border-slate-200 text-slate-700')}><Icon size={16}/>{label}</button>)}
              </div>
            </fieldset>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">{labels.cancel}</button>
              <a href={buildUrl(format)} onClick={() => setOpen(false)} className="inline-flex items-center gap-2 rounded-full bg-navy-950 px-5 py-2 text-sm font-bold text-white hover:bg-navy-800"><Download size={15}/>{labels.download}</a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
