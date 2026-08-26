'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Users } from 'lucide-react';
import { Button, Field, Input, Modal, Select, Textarea } from '../ui';
import { MultiLawyerSelector } from './multi-lawyer-selector';
import { toastSuccess, toastError } from '../toasts';
import { TASK_STATUS_LABEL } from '../task-constants';
import type { NavLocation } from '@/lib/constants';

/**
 * Admin task creator. One operation can assign the SAME task to up to 20
 * lawyers — the backend creates SEPARATE individual task records for each.
 */
export function TaskCreator({
  open,
  onClose,
  locations,
  lawyers,
  cases,
}: {
  open: boolean;
  onClose: () => void;
  locations: NavLocation[];
  lawyers: Array<{ id: string; name: string; isPrincipal?: boolean }>;
  cases: Array<{ id: string; name: string; number: string }>;
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

  React.useEffect(() => {
    if (open) {
      setLocationId('');
      setCaseId('');
      setDescription('');
      setNotes('');
      setDate('');
      setTime('');
      setLawyerIds([]);
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationId || !description.trim() || lawyerIds.length === 0) {
      toastError('المكان، وصف المهمة، واختيار المحامي على الأقل مطلوب.');
      return;
    }
    setBusy(true);
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locationId,
        caseId: caseId || undefined,
        description: description.trim(),
        notes: notes.trim() || undefined,
        scheduledDate: date || undefined,
        scheduledTime: time || undefined,
        lawyerIds,
      }),
    });
    setBusy(false);
    if (res.ok) {
      const d = await res.json();
      toastSuccess(lawyerIds.length > 1 ? `تم إنشاء ${d.createdCount} مهمة منفصلة — واحدة لكل محامي ✓` : 'تم إنشاء المهمة ✓');
      onClose();
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      toastError(d.error ?? 'تعذر إنشاء المهمة.');
    }
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
            {lawyerIds.length > 1
              ? `سيتم إنشاء ${lawyerIds.length} مهمة منفصلة — تظهر لكل محامي في صفحته وفي الفيد`
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
            <Select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">اختر المكان…</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="القضية" hint="اختياري">
            <Select value={caseId} onChange={(e) => setCaseId(e.target.value)}>
              <option value="">بدون قضية</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>{c.name} — {c.number}</option>
              ))}
            </Select>
          </Field>
          <Field label="التاريخ">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="الساعة">
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
        <Field label="المهمة — هيعمل إيه؟" required>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="مثال: حضور جلسة الطعن رقم…" />
        </Field>
        <Field label="ملاحظات">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[60px]" placeholder="ملاحظات إضافية (اختياري)" />
        </Field>
      </form>
    </Modal>
  );
}
