'use client';

import * as React from 'react';
import { Download, FileSpreadsheet, Upload } from 'lucide-react';

type ImportResult = { created?: number; updated?: number; casesCreated?: number; eventsImported?: number; rowsSkipped?: number; message?: string };

export function ClientSpreadsheetTools() {
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');
  const [details, setDetails] = React.useState<ImportResult | null>(null);

  async function importFile() {
    if (!file) { setError('اختر ملف Excel أو CSV أولاً.'); return; }
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.csv')) {
      setError('الصيغ المدعومة: .xlsx أو .csv محفوظ من Excel.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) { setError('حجم الملف أكبر من 10 ميجابايت. قسّم الملف ثم أعد المحاولة.'); return; }
    setBusy(true); setError(''); setMessage('جارٍ فحص الملف واستيراد البيانات...'); setDetails(null);
    try {
      const form = new FormData();
      form.set('file', file);
      const response = await fetch('/api/admin/clients/import', { method: 'POST', body: form });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'تعذر استيراد ملف Excel.');
      setDetails(result);
      setMessage(result.message || 'تم استيراد الملف بنجاح.');
      setFile(null);
      const input = document.getElementById('client-spreadsheet-file') as HTMLInputElement | null;
      if (input) input.value = '';
      window.setTimeout(() => window.location.reload(), 2200);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر الاتصال بالخادم.');
      setMessage('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="client-spreadsheet-import" dir="rtl" className="rounded-2xl border border-gold-200 bg-white p-4 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><FileSpreadsheet size={19}/></span>
          <div>
            <h2 className="text-sm font-black text-navy-950">استيراد وتصدير بيانات العملاء</h2>
            <p className="mt-1 max-w-3xl text-[11px] leading-6 text-navy-500">ارفع ملف Excel يحتوي على أسماء العملاء وبياناتهم وأرقام القضايا والمستجدات. تتم مطابقة العميل الموجود بالرقم القومي أو الهاتف ثم تحديثه، ويُضاف العميل الجديد عند عدم وجود تطابق. صفّ العناوين يجب أن يكون في أول صف.</p>
            <p className="text-[10px] font-semibold text-navy-400">الأعمدة المعروفة: اسم العميل، الهاتف، البريد الإلكتروني، الرقم القومي، العنوان، ملاحظات، اسم القضية، رقم القضية، وصف القضية، المستجدات، تاريخ المستجد.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2"><a href="/api/admin/clients/template" className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-navy-200 bg-ivory-50 px-3 py-2 text-[11px] font-extrabold text-navy-700"><FileSpreadsheet size={14}/>تحميل نموذج Excel</a><a href="/api/admin/clients/export" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-navy-950 px-3 py-2 text-[11px] font-extrabold text-white hover:bg-navy-800"><Download size={14}/>تحميل كل العملاء Excel</a></div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label htmlFor="client-spreadsheet-file" className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-navy-200 bg-ivory-50 px-3 py-2 text-xs font-bold text-navy-700">
          <Upload size={14}/>اختيار ملف
        </label>
        <input id="client-spreadsheet-file" type="file" accept=".xlsx,.csv" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setError(''); setMessage(''); }} className="max-w-full text-xs file:sr-only"/>
        <span className="max-w-full truncate text-xs text-navy-500">{file?.name ?? 'لم يتم اختيار ملف'}</span>
        <button type="button" disabled={busy || !file} onClick={() => void importFile()} className="rounded-xl bg-gold-500 px-4 py-2 text-xs font-extrabold text-navy-950 disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'جارٍ الاستيراد...' : 'استيراد إلى النظام'}</button>
      </div>
      {message && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs font-bold leading-6 text-emerald-800">{message}{details && <span className="block font-medium">عملاء جدد: {details.created ?? 0} · عملاء محدّثون: {details.updated ?? 0} · قضايا جديدة: {details.casesCreated ?? 0} · مستجدات مضافة: {details.eventsImported ?? 0} · صفوف متجاوزة: {details.rowsSkipped ?? 0}</span>}</p>}
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</p>}
    </section>
  );
}
