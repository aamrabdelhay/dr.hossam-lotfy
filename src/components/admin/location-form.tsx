'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { Button, Field, Input, Modal, Select, Textarea } from '../ui';
import { toastSuccess, toastError } from '../toasts';
import { LOCATION_TYPE_LABEL } from '@/lib/constants';

const TYPES = Object.keys(LOCATION_TYPE_LABEL) as Array<keyof typeof LOCATION_TYPE_LABEL>;

export function LocationForm({
  open,
  onClose,
  location,
}: {
  open: boolean;
  onClose: () => void;
  location?: {
    id: string;
    name: string;
    type: string;
    address: string | null;
    description: string | null;
  } | null;
}) {
  const router = useRouter();
  const [name, setName] = React.useState(location?.name ?? '');
  const [type, setType] = React.useState<string>(location?.type ?? 'COURT');
  const [address, setAddress] = React.useState(location?.address ?? '');
  const [description, setDescription] = React.useState(location?.description ?? '');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName(location?.name ?? '');
      setType(location?.type ?? 'COURT');
      setAddress(location?.address ?? '');
      setDescription(location?.description ?? '');
    }
  }, [open, location]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toastError('اسم المكان مطلوب.');
      return;
    }
    setBusy(true);
    const isEdit = !!location?.id;
    const res = await fetch(isEdit ? `/api/locations/${location.id}` : '/api/locations', {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        type,
        address: address.trim() || undefined,
        description: description.trim() || undefined,
      }),
    });
    setBusy(false);
    if (res.ok) {
      toastSuccess(isEdit ? 'تم حفظ المكان ✓' : 'تمت إضافة المكان وإنشاء صفحته ✓');
      onClose();
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      toastError(d.error ?? 'تعذر الحفظ.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={location ? 'تعديل مكان' : 'إضافة محكمة / مكان قانوني'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button type="submit" form="location-form" disabled={busy}>
            {busy && <Loader2 size={14} className="animate-spin" />}
            <Plus size={14} />
            {location ? 'حفظ' : 'إضافة'}
          </Button>
        </div>
      }
    >
      <form id="location-form" onSubmit={submit} className="space-y-4">
        <Field label="اسم المكان" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: محكمة جنوب القاهرة" />
        </Field>
        <Field label="النوع" required>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => (
              <option key={t} value={t}>{LOCATION_TYPE_LABEL[t]}</option>
            ))}
          </Select>
        </Field>
        <Field label="العنوان" hint="اختياري">
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <Field label="وصف" hint="اختياري">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[60px]" />
        </Field>
        <p className="rounded-lg bg-ivory-100 px-3 py-2 text-[11px] font-bold leading-5 text-navy-400">
          بمجرد الإضافة تُنشأ صفحة مستقلة للمكان تلقائياً (/locations/…) ويبدأ سجلها الزمني.
        </p>
      </form>
    </Modal>
  );
}
