'use client';

import * as React from 'react';
import { Loader2, UserRoundPlus, CheckCircle2 } from 'lucide-react';
import { Button, Field, Input, Select } from '../ui';
import { toastError } from '../toasts';

/**
 * First-time self-registration for a lawyer. The account is created in a
 * pending state (approvedAt = null) and only becomes usable after the office
 * approves it from the admin «المحامون» section.
 */
export function LawyerRegisterForm() {
  const [fullName, setFullName] = React.useState('');
  const [title, setTitle] = React.useState<'DOCTOR' | 'ADVOCATE'>('ADVOCATE');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [specialization, setSpecialization] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !email.trim()) {
      toastError('الاسم الثلاثي ورقم التليفون والبريد الإلكتروني مطلوبة.');
      return;
    }
    setBusy(true);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: fullName.trim(),
        title,
        phone: phone.trim(),
        email: email.trim(),
        specialization: specialization.trim() || undefined,
      }),
    });
    setBusy(false);
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setDone(true);
    } else {
      toastError(d.error ?? 'تعذر إرسال طلب التسجيل.');
    }
  };

  if (done) {
    return (
      <div className="mt-5 rounded-xl border border-emerald-600/20 bg-emerald-600/[0.05] px-4 py-4">
        <p className="flex items-center gap-2 text-[13px] font-extrabold text-emerald-700">
          <CheckCircle2 size={16} />
          تم استلام طلبك ✓
        </p>
        <p className="mt-1.5 text-[12px] font-medium leading-6 text-navy-500">
          حسابك الآن بانتظار اعتماد الإدارة. فور الاعتماد ستتمكن من الدخول بحساب Gmail ونشر مهامك.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-3">
      <Field label="الاسم الثلاثي الكامل" required hint="مثال: أحمد محمد السيد">
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="الصفة" required>
          <Select value={title} onChange={(e) => setTitle(e.target.value as 'DOCTOR' | 'ADVOCATE')}>
            <option value="ADVOCATE">محامي</option>
            <option value="DOCTOR">دكتور</option>
          </Select>
        </Field>
        <Field label="رقم التليفون" required>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01xxxxxxxxx" dir="ltr" />
        </Field>
      </div>
      <Field label="البريد الإلكتروني (Gmail)" required hint="ستستخدمه لتسجيل الدخول">
        <Input type="email" dir="ltr" className="ltr text-start" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" />
      </Field>
      <Field label="المجال / التخصص" hint="اختياري">
        <Input value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
      </Field>
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <UserRoundPlus size={14} />}
        إرسال طلب التسجيل
      </Button>
    </form>
  );
}
