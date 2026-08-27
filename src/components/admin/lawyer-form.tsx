'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { Button, Field, Input, Modal, Select, Textarea } from '../ui';
import { toastSuccess, toastError } from '../toasts';

export function LawyerForm({
  open,
  onClose,
  lawyer,
}: {
  open: boolean;
  onClose: () => void;
  lawyer?: {
    id: string;
    fullName: string;
    title: 'DOCTOR' | 'ADVOCATE';
    phone: string | null;
    email: string | null;
    specialization: string | null;
    bio: string | null;
    position: string | null;
  } | null;
}) {
  const router = useRouter();
  const [fullName, setFullName] = React.useState(lawyer?.fullName ?? '');
  const [title, setTitle] = React.useState<'DOCTOR' | 'ADVOCATE'>(lawyer?.title ?? 'ADVOCATE');
  const [phone, setPhone] = React.useState(lawyer?.phone ?? '');
  const [email, setEmail] = React.useState(lawyer?.email ?? '');
  const [specialization, setSpecialization] = React.useState(lawyer?.specialization ?? '');
  const [bio, setBio] = React.useState(lawyer?.bio ?? '');
  const [position, setPosition] = React.useState(lawyer?.position ?? '');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setFullName(lawyer?.fullName ?? '');
      setTitle(lawyer?.title ?? 'ADVOCATE');
      setPhone(lawyer?.phone ?? '');
      setEmail(lawyer?.email ?? '');
      setSpecialization(lawyer?.specialization ?? '');
      setBio(lawyer?.bio ?? '');
      setPosition(lawyer?.position ?? '');
    }
  }, [open, lawyer]);

  const nameParts = fullName.trim().split(/\s+/).filter(Boolean).length;
  const nameOk = nameParts >= 3;
  const phoneOk = /^[0-9+\-\s()]{6,20}$/.test(phone.trim()) && phone.trim().length >= 6;
  const emailOk = email.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      toastError('الصفة، الاسم الثلاثي، ورقم التليفون مطلوبة.');
      return;
    }
    setBusy(true);
    const isEdit = !!lawyer?.id;
    const res = await fetch(isEdit ? `/api/lawyers/${lawyer.id}` : '/api/lawyers', {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: fullName.trim(),
        title,
        phone: phone.trim(),
        email: email.trim() || undefined,
        specialization: specialization.trim() || undefined,
        bio: bio.trim() || undefined,
        position: position.trim() || undefined,
      }),
    });
    setBusy(false);
    if (res.ok) {
      toastSuccess(isEdit ? 'تم حفظ بيانات المحامي ✓' : 'تمت إضافة المحامي وإنشاء صفحته ✓');
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
      title={lawyer ? 'تعديل محامي' : 'إضافة محامي جديد'}
      wide
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button type="submit" form="lawyer-form" disabled={busy}>
            {busy && <Loader2 size={14} className="animate-spin" />}
            <Plus size={14} />
            {lawyer ? 'حفظ' : 'إضافة'}
          </Button>
        </div>
      }
    >
      <form id="lawyer-form" onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="الصفة" required>
            <Select value={title} onChange={(e) => setTitle(e.target.value as 'DOCTOR' | 'ADVOCATE')}>
              <option value="ADVOCATE">محامي</option>
              <option value="DOCTOR">دكتور</option>
            </Select>
          </Field>
          <Field label="رقم التليفون" required status={phoneOk}>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01xxxxxxxxx" dir="ltr" />
          </Field>
        </div>
        <Field label="الاسم الثلاثي الكامل" required hint="مثال: أحمد محمد السيد" status={nameOk}>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="البريد الإلكتروني" hint="اختياري" status={emailOk}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
          </Field>
          <Field label="المنصب" hint="اختياري">
            <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="مثال: Senior Advocate" />
          </Field>
        </div>
        <Field label="المجال / التخصص" hint="اختياري">
          <Input value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
        </Field>
        <Field label="نبذة" hint="اختياري">
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="min-h-[70px]" />
        </Field>
      </form>
    </Modal>
  );
}
