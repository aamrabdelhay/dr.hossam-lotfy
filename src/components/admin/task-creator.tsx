'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Users } from 'lucide-react';
import { Button, Field, Input, Modal, Textarea } from '../ui';
import { SelectWithAdd } from '../select-with-add';
import { MultiLawyerSelector } from './multi-lawyer-selector';
import { toastSuccess, toastError } from '../toasts';
import type { NavLocation } from '@/lib/constants';

/**
 * Admin task creator. One operation can assign work to up to 20 lawyers —
 * each lawyer gets their OWN task record via a SEPARATE POST, so the task
 * appears individually on the lawyer's page and the location's page.
 * «هيعمل إيه؟» (description) is optional.
 */
export function TaskCreator({
  open,
  onClose,
  locations,
  lawyers,
  cases,
  /** Prefilled date (yyyy-mm-dd), e.g. from the calendar. */
  defaultDate,
  /** Called after tasks were created (e.g. to refresh calendar tasks). */
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  locations: NavLocation[];
  lawyers: Array<{ id: string; name: string; isPrincipal?: boolean }>;
  cases: Array<{ id: string; name: string; number: string }>;
  defaultDate?: string;
  onCreated?: () => void | Promise<void>;
}) {
  const router = useRouter();
  const [locationId, setLocationId] = React.useState('');
  const [caseId, setCaseId] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [date, setDate] = React.useState('');
  const [time, setTime] = React.useState('');
  const [lawyerIds, setLawyerIds] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    if (open) {
      setLocationId('');
      setCaseId('');
      setDescription('');
      setNotes('');
      setDate(defaultDate ?? '');
      setTime('');
      setLawyerIds([]);
      setProgress(0);
    }
  }, [open, defaultDate]);

  const selectedCase = cases.find((c) => c.id === caseId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationId || lawyerIds.length === 0) {
      toastError('المكان واختيار المحامي على الأقل مطلوب.');
      return;
    }
    setBusy(true);
    setProgress(0);

    // Each task = one separate POST → one record per lawyer
    let ok = 0;
    let failed = 0;
    for (const lawyerId of lawyerIds) {
      try {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locationId,
            caseName: selectedCase?.name || undefined,
            caseNumber: selectedCase?.number || undefined,
            description: description.trim() || undefined,
            notes: notes.trim() || undefined,
            scheduledDate: date || undefined,
            scheduledTime: time || undefined,
            lawyerIds: [lawyerId],
          }),
        });
        if (res.ok) ok += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
      setProgress(ok + failed);
    }

    setBusy(false);
    if (ok > 0) {
      toastSuccess(
        failed === 0
          ? lawyerIds.length > 1
            ? `تم إنشاء ${ok} مهمة منفصلة — واحدة لكل محامي ✓`
            : 'تم إنشاء المهمة ✓'
          : `تم إنشاء ${ok} مهمة، وفشل ${failed} — أعد المحاولة للباقي.`,
      );
      onClose();
      router.refresh();
      await onCreated?.();
    } else {
      toastError('تعذر إنشاء المهمة.');
    }
  };

  const addLocation = async (label: string): Promise<string | void> => {
    const res = await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: label, type: 'OTHER' }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok && d?.location?.id) {
      return d.location.id as string;
    }
    toastError(d.error ?? 'تعذر إضافة المكان.');
  };

  const addCase = async (label: string): Promise<string | void> => {
    const res = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: label, number: '—' }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok && d?.case?.id) {
      return d.case.id as string;
    }
    toastError(d.error ?? 'تعذر إضافة القضية.');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إضافة مهمة / جلسة"
      wide
      footer={
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold text-navy-400">
            {busy
              ? `جارٍ الإنشاء… (${progress}/${lawyerIds.length})`
              : lawyerIds.length > 1
                ? `سيتم إنشاء ${lawyerIds.length} مهمة منفصلة — تظهر لكل محامي في صفحته وفي صفحة المكان`
                : 'المهمة ستظهر في: الفيد، صفحة المحامي، صفحة المكان، التقويم، والشريط الجانبي'}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>إلغاء</Button>
            <Button type="submit" form="task-creator-form" disabled={busy}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={15} />}
              إنشاء
            </Button>
          </div>
        </div>
      }
    >
      <form id="task-creator-form" onSubmit={submit} className="space-y-4">
        <Field label="المحامي/المحامون المكلفون" required hint="حتى 20 محامياً">
          <MultiLawyerSelector lawyers={lawyers} selected={lawyerIds} onChange={setLawyerIds} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="المحكمة / المكان" required>
            <SelectWithAdd
              id="task-location"
              name="locationId"
              ariaLabel="المحكمة أو المكان"
              placeholder="اختر المكان…"
              options={locations.map((l) => ({ value: l.id, label: l.name }))}
              value={locationId}
              onChange={setLocationId}
              onAdd={addLocation}
            />
          </Field>
          <Field label="القضية" hint="اختياري">
            <SelectWithAdd
              id="task-case"
              name="caseId"
              ariaLabel="القضية"
              placeholder="بدون قضية"
              options={cases.map((c) => ({ value: c.id, label: `${c.name} — ${c.number}` }))}
              value={caseId}
              onChange={setCaseId}
              onAdd={addCase}
            />
          </Field>
          <Field label="التاريخ">
            <Input type="date" name="scheduledDate" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="الساعة">
            <Input type="time" name="scheduledTime" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
        <Field label="المهمة — هيعمل إيه؟" hint="اختياري">
          <Textarea name="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="مثال: حضور جلسة الطعن رقم…" />
        </Field>
        <Field label="ملاحظات">
          <Textarea name="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[60px]" placeholder="ملاحظات إضافية (اختياري)" />
        </Field>
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-navy-300">
          <Users size={13} />
          كل محامٍ سيحصل على مهمة مستقلة خاصة به.
        </p>
      </form>
    </Modal>
  );
}
