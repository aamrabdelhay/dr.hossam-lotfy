'use client';

import * as React from 'react';
import { FilePlus2 } from 'lucide-react';
import { Button, Card, Field, Input } from './ui';
import { toastError, toastSuccess } from './toasts';

const fields = [
  ['year', 'سنة القضية', 'مثال: 2021'],
  ['court', 'المحكمة', 'مثال: محكمة جنوب القاهرة'],
  ['circuit', 'الدائرة', 'مثال: الدائرة 5 مدني'],
  ['caseType', 'نوع القضية / التصنيف', 'مثال: مدني، تجاري، جنائي'],
  ['plaintiff', 'المدعي', 'اسم المدعي'],
  ['defendant', 'المدعى عليه', 'اسم المدعى عليه'],
  ['responsibleLawyer', 'المحامي المسؤول', 'اسم المحامي'],
  ['status', 'حالة القضية', 'مثال: انتهت، مؤجلة، حكم نهائي'],
  ['filingDate', 'تاريخ القيد / بداية القضية', 'YYYY-MM-DD'],
  ['lastActionDate', 'تاريخ آخر إجراء', 'YYYY-MM-DD'],
  ['judgmentDate', 'تاريخ الحكم', 'YYYY-MM-DD'],
  ['judgmentResult', 'نتيجة القضية / الحكم', 'الحكم أو النتيجة باختصار'],
] as const;

type FormState = Record<(typeof fields)[number][0] | 'name' | 'number' | 'clientName' | 'description', string>;

const emptyForm: FormState = {
  name: '', number: '', clientName: '', description: '', year: '', court: '', circuit: '', caseType: '',
  plaintiff: '', defendant: '', responsibleLawyer: '', status: '', filingDate: '', lastActionDate: '', judgmentDate: '', judgmentResult: '',
};

export function CaseArchiveCreate() {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(emptyForm);

  const set = (key: keyof FormState, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.number.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toastError(data.error ?? 'تعذر إضافة القضية.');
        return;
      }
      toastSuccess('تمت إضافة القضية القديمة إلى الأرشيف ✓');
      setForm(emptyForm);
      setOpen(false);
      window.location.reload();
    } catch {
      toastError('تعذر الاتصال بالخادم. حاول مرة أخرى.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Button size="sm" variant="gold" onClick={() => setOpen((v) => !v)}>
        <FilePlus2 size={14} />
        إضافة قضية قديمة
      </Button>
      {open && (
        <Card className="mt-3 p-4">
          <div className="mb-4">
            <h2 className="text-[14px] font-extrabold text-navy-900">إضافة قضية قديمة إلى الأرشيف</h2>
            <p className="mt-1 text-[11px] font-semibold text-navy-400">كل البيانات اختيارية باستثناء اسم القضية ورقم القضية، ويمكنك إضافة أي معلومات متاحة فقط.</p>
          </div>
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
            <Field label="اسم القضية">
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="مثال: دعوى شركة ..." required />
            </Field>
            <Field label="رقم القضية">
              <Input value={form.number} onChange={(e) => set('number', e.target.value)} placeholder="رقم / سنة" required dir="ltr" />
            </Field>
            <Field label="اسم العميل">
              <Input value={form.clientName} onChange={(e) => set('clientName', e.target.value)} placeholder="اختياري" />
            </Field>
            {fields.map(([key, label, placeholder]) => (
              <Field key={key} label={label}>
                <Input
                  value={form[key]}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder={`${placeholder} — اختياري`}
                  dir={key.includes('Date') || key === 'year' ? 'ltr' : undefined}
                  type={key.includes('Date') ? 'date' : 'text'}
                />
              </Field>
            ))}
            <Field label="ملاحظات تاريخية">
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="أي معلومات أو ملاحظات إضافية — اختياري"
                rows={4}
                className="w-full rounded-xl border border-navy-200 bg-white px-3 py-2.5 text-[13px] text-navy-900 outline-none transition focus:border-gold-500/60 focus:ring-2 focus:ring-gold-500/20"
              />
            </Field>
            <div className="flex items-end gap-2 sm:col-span-2">
              <Button type="submit" size="sm" disabled={busy}>{busy ? 'جارٍ الحفظ…' : 'حفظ في الأرشيف'}</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>إلغاء</Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
