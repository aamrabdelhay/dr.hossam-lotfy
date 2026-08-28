'use client';

import * as React from 'react';
import { FilePlus2 } from 'lucide-react';
import { Button, Card, Field, Input } from './ui';
import { toastError, toastSuccess } from './toasts';

export function CaseArchiveCreate() {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [name, setName] = React.useState('');
  const [number, setNumber] = React.useState('');
  const [clientName, setClientName] = React.useState('');
  const [description, setDescription] = React.useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !number.trim() || busy) return;
    setBusy(true);
    const res = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, number, clientName, description }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toastError(data.error ?? 'تعذر إضافة القضية.');
      return;
    }
    toastSuccess('تمت إضافة القضية إلى سجل المكتب ✓');
    setName(''); setNumber(''); setClientName(''); setDescription('');
    setOpen(false);
    window.location.reload();
  };

  return (
    <div>
      <Button size="sm" variant="gold" onClick={() => setOpen((v) => !v)}>
        <FilePlus2 size={14} />
        إضافة قضية قديمة
      </Button>
      {open && (
        <Card className="mt-3 p-4">
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
            <Field label="اسم القضية">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: دعوى شركة ..." required />
            </Field>
            <Field label="رقم القضية">
              <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="رقم / سنة" required dir="ltr" />
            </Field>
            <Field label="اسم العميل">
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="اسم العميل" />
            </Field>
            <Field label="وصف / ملاحظات تاريخية">
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="أي معلومات عن القضية القديمة" />
            </Field>
            <div className="flex items-end gap-2 sm:col-span-2">
              <Button type="submit" size="sm" disabled={busy}>{busy ? 'جارٍ الحفظ…' : 'حفظ في السجل'}</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
