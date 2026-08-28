'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Users } from 'lucide-react';
import { Button, Field, Input, Modal, Textarea } from '../ui';
import { ComboboxWithAdd } from '../combobox-with-add';
import { MultiLawyerSelector } from './multi-lawyer-selector';
import { toastSuccess, toastError } from '../toasts';
import type { NavLocation } from '@/lib/constants';

export function TaskCreator({
  open,
  onClose,
  locations,
  lawyers,
  cases,
  defaultDate,
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
  const [clientName, setClientName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [date, setDate] = React.useState('');
  const [time, setTime] = React.useState('');
  const [lawyerIds, setLawyerIds] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    if (open) {
      setLocationId(''); setCaseId(''); setClientName(''); setDescription(''); setNotes('');
      setDate(defaultDate ?? ''); setTime(''); setLawyerIds([]); setProgress(0);
    }
  }, [open, defaultDate]);

  const selectedCase = cases.find((c) => c.id === caseId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationId || lawyerIds.length === 0) {
      toastError('المكان واختيار المحامي على الأقل مطلوب.');
      return;
    }
    setBusy(true); setProgress(0);
    let ok = 0; let failed = 0; let firstError = '';
    for (const lawyerId of lawyerIds) {
      try {
        const res = await fetch('/api/tasks', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locationId,
            caseName: selectedCase?.name || undefined,
            caseNumber: selectedCase?.number || undefined,
            clientName: clientName.trim() || undefined,
            description: description.trim() || undefined,
            notes: notes.trim() || undefined,
            scheduledDate: date || undefined,
            scheduledTime: time || undefined,
            lawyerIds: [lawyerId],
          }),
        });
        if (res.ok) ok += 1;
        else {
          failed += 1;
          if (!firstError) {
            const d = await res.json().catch(() => null as { error?: string } | null);
            firstError = d?.error || `فشل الطلب (${res.status})`;
          }
        }
      } catch (err) {
        failed += 1; if (!firstError) firstError = err instanceof Error ? err.message : 'تعذر الاتصال بالخادم';
      }
      setProgress(ok + failed);
    }
    setBusy(false);
    if (ok > 0) {
      toastSuccess(failed === 0 ? (lawyerIds.length > 1 ? `تم إنشاء ${ok} مهمة منفصلة — واحدة لكل محامي ✓` : 'تم إنشاء المهمة ✓') : `تم إنشاء ${ok} مهمة، وفشل ${failed} — ${firstError}`);
      onClose(); router.refresh(); await onCreated?.();
    } else toastError(firstError ? `تعذر إنشاء المهمة: ${firstError}` : 'تعذر إنشاء المهمة.');
  };

  const addLocation = async (label: string): Promise<string | void> => {
    try {
      const res = await fetch('/api/locations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: label, type: 'OTHER' }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d?.location?.id) return d.location.id as string;
      toastError(d.error ?? `تعذر إضافة المكان (${res.status}).`);
    } catch { toastError('تعذر الاتصال بالخادم أثناء إضافة المكان.'); }
  };

  const addCase = async (label: string): Promise<string | void> => {
    try {
      const res = await fetch('/api/cases', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: label, number: `AUTO-${Date.now()}` }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d?.case?.id) return d.case.id as string;
      toastError(d.error ?? `تعذر إضافة القضية (${res.status}).`);
    } catch { toastError('تعذر الاتصال بالخادم أثناء إضافة القضية.'); }
  };

  return (
    <Modal open={open} onClose={onClose} title="إضافة مهمة / جلسة" wide footer={
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold text-navy-400">{busy ? `جارٍ الإنشاء… (${progress}/${lawyerIds.length})` : lawyerIds.length > 1 ? `سيتم إنشاء ${lawyerIds.length} مهمة منفصلة — تظهر لكل محامي في صفحته وفي صفحة المكان` : 'المهمة ستظهر في: الفيد، صفحة المحامي، صفحة المكان، التقويم، والشريط الجانبي'}</p>
        <div className="flex gap-2"><Button variant="ghost" onClick={onClose}>إلغاء</Button><Button type="submit" form="task-creator-form" disabled={busy}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={15} />} إنشاء</Button></div>
      </div>
    }>
      <form id="task-creator-form" onSubmit={submit} className="space-y-4">
        <Field label="المحامي/المحامون المكلفون" required hint="حتى 20 محامياً" status={lawyerIds.length > 0}><MultiLawyerSelector lawyers={lawyers} selected={lawyerIds} onChange={setLawyerIds} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="المحكمة / المكان" required status={!!locationId}><ComboboxWithAdd id="task-location" name="locationId" ariaLabel="المحكمة أو المكان" placeholder="ابحث بالاسم أو اكتب محكمة جديدة…" options={locations.map((l) => ({ value: l.id, label: l.name }))} value={locationId} onChange={setLocationId} onAdd={addLocation} /></Field>
          <Field label="القضية" hint="اختياري"><ComboboxWithAdd id="task-case" name="caseId" ariaLabel="القضية" placeholder="ابحث أو اختر قضية…" options={cases.map((c) => ({ value: c.id, label: `${c.name} — ${c.number}` }))} value={caseId} onChange={setCaseId} onAdd={addCase} /></Field>
          <Field label="اسم العميل" hint="اختياري — يُسجّل على القضية"><Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="اسم العميل" /></Field>
          <Field label="التاريخ" status={!!date}><Input type="date" name="scheduledDate" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="الساعة" status={!!time}><Input type="time" name="scheduledTime" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        </div>
        <Field label="المهمة — هيعمل إيه؟" hint="اختياري"><Textarea name="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="مثال: حضور جلسة الطعن رقم…" /></Field>
        <Field label="ملاحظات"><Textarea name="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[60px]" placeholder="ملاحظات إضافية (اختياري)" /></Field>
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-navy-300"><Users size={13} />كل محامٍ سيحصل على مهمة مستقلة خاصة به.</p>
      </form>
    </Modal>
  );
}