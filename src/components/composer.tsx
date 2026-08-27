'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PenLine, X } from 'lucide-react';
import { Avatar, Button, Card, Field, Input, Textarea } from './ui';
import { ComboboxWithAdd } from './combobox-with-add';
import { toastSuccess, toastError } from './toasts';
import { cn } from '@/lib/cn';
import type { NavLocation } from '@/lib/constants';

/**
 * Post composer for the logged-in lawyer (their own post on their profile /
 * the main feed). Admins use the full task creator in the admin area.
 */
export function Composer({ lawyerName, lawyerPhoto, locations, defaultLocationId }: {
  lawyerName: string;
  lawyerPhoto?: string | null;
  locations: NavLocation[];
  defaultLocationId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [locationId, setLocationId] = React.useState(defaultLocationId ?? '');
  const [date, setDate] = React.useState('');
  const [time, setTime] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationId) {
      toastError('المكان مطلوب.');
      return;
    }
    setBusy(true);
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locationId,
        description: description.trim() || undefined,
        notes: notes.trim() || undefined,
        scheduledDate: date || undefined,
        scheduledTime: time || undefined,
        ownPost: true,
      }),
    });
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      setDescription('');
      setNotes('');
      setDate('');
      setTime('');
      toastSuccess('تم نشر البوست ✓');
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      toastError(d.error ?? 'تعذر النشر.');
    }
  };

  const addLocation = async (label: string): Promise<string | void> => {
    const res = await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: label, type: 'OTHER' }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok && d?.location?.id) return d.location.id as string;
    toastError(d.error ?? 'تعذر إضافة المكان.');
  };

  return (
    <Card className="overflow-hidden">
      {!open ? (
        <button onClick={() => setOpen(true)} className="flex w-full items-center gap-3 px-4 py-3 text-start hover:bg-navy-800">
          <Avatar name={lawyerName} src={lawyerPhoto} size={40} />
          <span className="flex-1 rounded-lg border border-navy-200 bg-navy-800 px-3 py-2.5 text-[13px] font-semibold text-navy-300">
            اكتب مهمة أو نشاطاً جديداً…
          </span>
          <PenLine size={17} className="text-navy-300" />
        </button>
      ) : (
        <form onSubmit={submit} className="space-y-3 px-4 py-4">
          <div className="flex items-center gap-2.5">
            <Avatar name={lawyerName} src={lawyerPhoto} size={36} />
            <div className="flex-1">
              <p className="text-[13px] font-extrabold text-ivory-100">{lawyerName}</p>
              <p className="text-[11px] text-navy-300">بوست جديد — سيظهر في صفحتك وفي الفيد الرئيسي</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1.5 text-navy-300 hover:bg-white/5">
              <X size={16} />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="المكان" required>
              <ComboboxWithAdd
                ariaLabel="المكان"
                placeholder="ابحث بالاسم أو اختر…"
                options={locations.map((l) => ({ value: l.id, label: l.name }))}
                value={locationId}
                onChange={setLocationId}
                onAdd={addLocation}
              />
            </Field>
            <Field label="التاريخ">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="الساعة">
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
          </div>
          <Field label="المهمة — هتعمل إيه؟" hint="اختياري">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="مثال: حضور جلسة محكمة النقض…" />
          </Field>
          <Field label="ملاحظات">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[60px]" placeholder="ملاحظات إضافية (اختياري)" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 size={14} className="animate-spin" />}
              نشر
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
