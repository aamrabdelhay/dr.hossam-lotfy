'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, Edit3, Loader2 } from 'lucide-react';
import { Button, Field, Input, Modal, Textarea } from '../ui';
import { ComboboxWithAdd } from '../combobox-with-add';
import { MultiLawyerSelector } from './multi-lawyer-selector';
import { toastSuccess, toastError } from '../toasts';
import type { NavLocation } from '@/lib/constants';

type Step = 'form' | 'review';

type Props = {
  open: boolean;
  onClose: () => void;
  locations: NavLocation[];
  lawyers: Array<{ id: string; name: string; isPrincipal?: boolean }>;
  cases: Array<{ id: string; name: string; number: string }>;
  defaultDate?: string;
  onCreated?: () => void | Promise<void>;
  ownPost?: boolean;
};

export function TaskCreator({ open, onClose, locations, lawyers, cases, defaultDate, onCreated, ownPost = false }: Props) {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>('form');
  const [locationId, setLocationId] = React.useState('');
  const [caseId, setCaseId] = React.useState('');
  const [clientName, setClientName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [date, setDate] = React.useState('');
  const [time, setTime] = React.useState('');
  const [lawyerIds, setLawyerIds] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [createdCount, setCreatedCount] = React.useState(0);

  const resetForm = React.useCallback(() => {
    setStep('form');
    setLocationId('');
    setCaseId('');
    setClientName('');
    setDescription('');
    setNotes('');
    setDate(defaultDate ?? '');
    setTime('');
    setLawyerIds(ownPost && lawyers[0] ? [lawyers[0].id] : []);
  }, [defaultDate, ownPost, lawyers]);

  React.useEffect(() => {
    if (open) {
      resetForm();
      setCreatedCount(0);
    }
  }, [open, resetForm]);

  const selectedCase = cases.find((item) => item.id === caseId);
  const selectedLocation = locations.find((item) => item.id === locationId);
  const selectedLawyers = lawyers.filter((lawyer) => lawyerIds.includes(lawyer.id));

  const continueToReview = (event: React.FormEvent) => {
    event.preventDefault();
    if (!description.trim()) return toastError('اسم التكليف مطلوب.');
    setStep('review');
  };

  const submit = async () => {
    if (!description.trim()) return toastError('اسم التكليف مطلوب.');
    setBusy(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: locationId || undefined,
          caseName: selectedCase?.name || undefined,
          caseNumber: selectedCase?.number || undefined,
          clientName: clientName.trim() || undefined,
          description: description.trim(),
          notes: notes.trim() || undefined,
          scheduledDate: date || undefined,
          scheduledTime: time || undefined,
          lawyerIds: ownPost ? undefined : (lawyerIds.length ? lawyerIds : undefined),
          ownPost,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `فشل الطلب (${res.status})`);
      setCreatedCount((value) => value + 1);
      toastSuccess('تم حفظ التكليف ✓');
      router.refresh();
      await onCreated?.();
      resetForm();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'تعذر إنشاء التكليف.');
    } finally {
      setBusy(false);
    }
  };

  const addLocation = async (label: string): Promise<string | void> => {
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: label, type: 'OTHER' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.location?.id) {
        toastSuccess('تمت إضافة الجهة ✓');
        router.refresh();
        return data.location.id as string;
      }
      toastError(data.error ?? `تعذر إضافة الجهة (${res.status}).`);
    } catch {
      toastError('تعذر الاتصال بالخادم أثناء إضافة الجهة.');
    }
  };

  const addCase = async (label: string): Promise<string | void> => {
    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: label, number: `AUTO-${Date.now()}` }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.case?.id) return data.case.id as string;
      toastError(data.error ?? `تعذر إضافة القضية (${res.status}).`);
    } catch {
      toastError('تعذر الاتصال بالخادم أثناء إضافة القضية.');
    }
  };

  const summaryValue = (value: React.ReactNode) => <span className="text-[12px] font-extrabold text-navy-900">{value || 'غير محدد'}</span>;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={step === 'form' ? 'إضافة تكليف' : 'مراجعة قبل التنفيذ'}
      wide
      footer={
        step === 'form' ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] font-bold text-navy-400">
              {createdCount ? `تم حفظ ${createdCount} تكليف` : 'لن يتم إنشاء المهمة قبل اعتمادها في خطوة المراجعة'}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>إغلاق</Button>
              <Button type="submit" form="task-creator-form" disabled={busy} variant="gold">
                <ArrowRight size={14} />
                التالي: مراجعة
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] font-bold text-navy-400">
              <CheckCircle2 size={15} className="text-emerald-600" />
              راجع البيانات وحدد التنفيذ ثم اعتمد المهمة
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('form')} disabled={busy}>
                <Edit3 size={14} /> تعديل
              </Button>
              <Button variant="ghost" onClick={onClose} disabled={busy}>إغلاق</Button>
              <Button onClick={submit} disabled={busy} variant="gold">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={15} />}
                اعتماد وتنفيذ المهمة
              </Button>
            </div>
          </div>
        )
      }
    >
      {step === 'form' ? (
        <form id="task-creator-form" onSubmit={continueToReview} className="space-y-4">
          <Field label="اسم التكليف" required status={!!description.trim()}>
            <Textarea name="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="مثال: مراجعة ملف القضية أو إعداد مذكرة دفاع" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="المحامي / المحامون" status={lawyerIds.length > 0}>
              <MultiLawyerSelector lawyers={lawyers} selected={lawyerIds} onChange={setLawyerIds} />
            </Field>

            <Field label="المحكمة / جهة حكومية" status={!!locationId}>
              <ComboboxWithAdd
                id="task-location"
                name="locationId"
                ariaLabel="المحكمة أو الجهة الحكومية"
                placeholder="اختياري"
                options={locations.map((location) => ({ value: location.id, label: location.name }))}
                value={locationId}
                onChange={setLocationId}
                onAdd={addLocation}
              />
            </Field>

            <Field label="القضية" status={!!caseId}>
              <ComboboxWithAdd
                id="task-case"
                name="caseId"
                ariaLabel="القضية"
                placeholder="اختياري"
                options={cases.map((item) => ({ value: item.id, label: `${item.name} — ${item.number}` }))}
                value={caseId}
                onChange={setCaseId}
                onAdd={addCase}
              />
            </Field>

            <Field label="اسم العميل" status={!!clientName.trim()}>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="اختياري" />
              <span className="text-[9px] font-semibold text-navy-300">اختياري — لا يحول التكليف إلى قضية.</span>
            </Field>

            <Field label="التاريخ" status={!!date}>
              <Input type="date" name="scheduledDate" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>

            <Field label="الساعة" status={!!time}>
              <Input type="time" name="scheduledTime" value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
          </div>

          <Field label="ملاحظات" status={!!notes.trim()}>
            <Textarea name="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[60px]" placeholder="اختياري" />
          </Field>
        </form>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl border border-gold-500/20 bg-gold-50/40 p-4">
            <div className="mb-2 flex items-center gap-2 text-[12px] font-black text-navy-900">
              <CheckCircle2 size={16} className="text-gold-600" />
              المهمة جاهزة للاعتماد
            </div>
            <p className="text-[11px] font-semibold leading-6 text-navy-500">
              بعد الضغط على «اعتماد وتنفيذ المهمة» سيتم حفظها في قاعدة البيانات وتظهر في الفيد والتكليفات والتقويم بنفس خيارات المهمة العادية.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ReviewItem label="اسم التكليف" value={summaryValue(description.trim())} full />
            <ReviewItem label="المحامي / المحامون" value={summaryValue(selectedLawyers.length ? selectedLawyers.map((lawyer) => lawyer.name).join('، ') : 'غير مسند')} />
            <ReviewItem label="المحكمة / الجهة" value={summaryValue(selectedLocation?.name)} />
            <ReviewItem label="القضية" value={summaryValue(selectedCase ? `${selectedCase.name} — ${selectedCase.number}` : '')} />
            <ReviewItem label="اسم العميل" value={summaryValue(clientName.trim())} />
            <ReviewItem label="التاريخ" value={summaryValue(date)} />
            <ReviewItem label="الساعة" value={summaryValue(time)} />
            <ReviewItem label="الملاحظات" value={summaryValue(notes.trim())} full />
          </div>
        </div>
      )}
    </Modal>
  );
}

function ReviewItem({ label, value, full = false }: { label: string; value: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2 rounded-xl border border-navy-100 bg-white p-3.5' : 'rounded-xl border border-navy-100 bg-white p-3.5'}>
      <div className="mb-1 text-[10px] font-bold text-navy-300">{label}</div>
      {value}
    </div>
  );
}
