'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button, Field, Input, Modal, Select, Textarea } from './ui';
import { SelectWithAdd } from './select-with-add';
import { toastSuccess, toastError } from './toasts';
import type { NavLocation } from '@/lib/constants';
import { TASK_STATUS, TASK_STATUS_LABEL } from './task-constants';

export function SessionEditForm({
  open,
  onClose,
  task,
  locations,
  lawyers,
}: {
  open: boolean;
  onClose: () => void;
  task: {
    id: string;
    description: string;
    notes: string | null;
    locationId: string;
    caseName: string | null;
    caseNumber: string | null;
    scheduledDate: string | null;
    scheduledTime: string | null;
    status: string;
    lawyerIds: string[];
  };
  locations: NavLocation[];
  lawyers: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [locationId, setLocationId] = React.useState(task.locationId);
  const [caseName, setCaseName] = React.useState(task.caseName ?? '');
  const [caseNumber, setCaseNumber] = React.useState(task.caseNumber ?? '');
  const [description, setDescription] = React.useState(task.description);
  const [notes, setNotes] = React.useState(task.notes ?? '');
  const [date, setDate] = React.useState(task.scheduledDate ?? '');
  const [time, setTime] = React.useState(task.scheduledTime ?? '');
  const [status, setStatus] = React.useState(task.status);
  const [lawyerIds, setLawyerIds] = React.useState<string[]>(task.lawyerIds);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setLocationId(task.locationId);
      setCaseName(task.caseName ?? '');
      setCaseNumber(task.caseNumber ?? '');
      setDescription(task.description);
      setNotes(task.notes ?? '');
      setDate(task.scheduledDate ?? '');
      setTime(task.scheduledTime ?? '');
      setStatus(task.status);
      setLawyerIds(task.lawyerIds);
    }
  }, [open, task]);

  const toggleLawyer = (id: string) => {
    setLawyerIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationId || !description.trim()) {
      toastError('المكان ووصف المهمة مطلوبان.');
      return;
    }
    if (lawyerIds.length > 20) {
      toastError('الحد الأقصى 20 محامياً.');
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locationId,
        description: description.trim(),
        notes: notes.trim() || undefined,
        caseName: caseName.trim() || undefined,
        caseNumber: caseNumber.trim() || undefined,
        scheduledDate: date || undefined,
        scheduledTime: time || undefined,
        status,
        lawyerIds,
      }),
    });
    setBusy(false);
    if (res.ok) {
      toastSuccess('تم حفظ التعديلات ✓');
      onClose();
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      toastError(d.error ?? 'تعذر حفظ التعديلات.');
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
    <Modal open={open} onClose={onClose} title="تعديل المهمة / الجلسة" wide
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 size={14} className="animate-spin" />}
            حفظ التعديلات
          </Button>
        </div>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="المحكمة / المكان" required>
            <SelectWithAdd
              ariaLabel="المحكمة أو المكان"
              options={locations.map((l) => ({ value: l.id, label: l.name }))}
              value={locationId}
              onChange={setLocationId}
              onAdd={addLocation}
            />
          </Field>
          <Field label="الحالة">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {Object.entries(TASK_STATUS_LABEL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </Select>
          </Field>
          <Field label="اسم القضية">
            <Input value={caseName} onChange={(e) => setCaseName(e.target.value)} placeholder="اختياري" />
          </Field>
          <Field label="رقم القضية">
            <Input value={caseNumber} onChange={(e) => setCaseNumber(e.target.value)} placeholder="اختياري" />
          </Field>
          <Field label="التاريخ">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="الساعة">
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
        <Field label="وصف المهمة — هتعمل إيه؟" required>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="ملاحظات">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[60px]" />
        </Field>
        <Field label="المحامي/المحامون المسؤولون" hint={`(${lawyerIds.length}/20)`}>
          <div className="grid max-h-44 grid-cols-1 gap-1 overflow-y-auto rounded-lg border border-navy-200 p-2 sm:grid-cols-2">
            {lawyers.map((l) => (
              <label key={l.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] font-semibold text-navy-700 hover:bg-ivory-100">
                <input
                  type="checkbox"
                  checked={lawyerIds.includes(l.id)}
                  onChange={() => toggleLawyer(l.id)}
                  className="h-4 w-4 accent-gold-500"
                />
                {l.name}
              </label>
            ))}
          </div>
        </Field>
      </form>
    </Modal>
  );
}
