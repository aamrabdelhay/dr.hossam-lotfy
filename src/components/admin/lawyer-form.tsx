'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { Button, Field, Input, Modal, Select, Textarea } from '../ui';
import { toastSuccess, toastError } from '../toasts';

type LawyerFormData = {
  id: string;
  fullName: string;
  title: 'DOCTOR' | 'ADVOCATE';
  phone: string | null;
  email: string | null;
  googleEmail?: string | null;
  specialization: string | null;
  bio: string | null;
  position: string | null;
};

export function LawyerForm({ open, onClose, lawyer }: { open: boolean; onClose: () => void; lawyer?: LawyerFormData | null }) {
  const router = useRouter();
  const [fullName, setFullName] = React.useState(lawyer?.fullName ?? '');
  const [title, setTitle] = React.useState<'DOCTOR' | 'ADVOCATE'>(lawyer?.title ?? 'ADVOCATE');
  const [phone, setPhone] = React.useState(lawyer?.phone ?? '');
  const [email, setEmail] = React.useState(lawyer?.email ?? '');
  const [googleEmail, setGoogleEmail] = React.useState(lawyer?.googleEmail ?? '');
  const [specialization, setSpecialization] = React.useState(lawyer?.specialization ?? '');
  const [bio, setBio] = React.useState(lawyer?.bio ?? '');
  const [position, setPosition] = React.useState(lawyer?.position ?? '');
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (!open) return; setFullName(lawyer?.fullName ?? ''); setTitle(lawyer?.title ?? 'ADVOCATE'); setPhone(lawyer?.phone ?? ''); setEmail(lawyer?.email ?? ''); setGoogleEmail(lawyer?.googleEmail ?? ''); setSpecialization(lawyer?.specialization ?? ''); setBio(lawyer?.bio ?? ''); setPosition(lawyer?.position ?? ''); }, [open, lawyer]);
  const nameOk = fullName.trim().split(/\s+/).filter(Boolean).length >= 3;
  const phoneOk = /^[0-9+\-\s()]{6,20}$/.test(phone.trim()) && phone.trim().length >= 6;
  const validEmail = (value: string) => value.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!nameOk || !phoneOk || !validEmail(email) || !validEmail(googleEmail)) { toastError('راجع الاسم ورقم التليفون والبريد الإلكتروني.'); return; } setBusy(true);
    try { const isEdit = !!lawyer?.id; const res = await fetch(isEdit ? `/api/lawyers/${lawyer.id}` : '/api/lawyers', { method: isEdit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: fullName.trim(), title, phone: phone.trim(), email: email.trim() || null, googleEmail: googleEmail.trim() || null, specialization: specialization.trim() || null, bio: bio.trim() || null, position: position.trim() || null }) }); if (!res.ok) { const d = await res.json().catch(() => ({})); toastError(d.error ?? 'تعذر الحفظ.'); return; } toastSuccess(isEdit ? 'تم حفظ بيانات المحامي ✓' : 'تمت إضافة المحامي وإنشاء صفحته ✓'); onClose(); router.refresh(); } catch { toastError('تعذر الاتصال بالخادم. حاول مرة أخرى.'); } finally { setBusy(false); }
  };
  return <Modal open={open} onClose={onClose} title={lawyer ? 'تعديل محامي' : 'إضافة محامي جديد'} wide footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>إلغاء</Button><Button type="submit" form="lawyer-form" disabled={busy}>{busy && <Loader2 size={14} className="animate-spin" />}<Plus size={14} />{lawyer ? 'حفظ' : 'إضافة'}</Button></div>}><form id="lawyer-form" onSubmit={submit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="الصفة" required status={!!title}><Select value={title} onChange={(e) => setTitle(e.target.value as 'DOCTOR' | 'ADVOCATE')}><option value="ADVOCATE">محامي</option><option value="DOCTOR">دكتور</option></Select></Field><Field label="رقم التليفون" required status={phoneOk}><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01xxxxxxxxx" dir="ltr" /></Field></div><Field label="الاسم الثلاثي الكامل" required status={nameOk}><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="البريد الإلكتروني" status={validEmail(email)}><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" /></Field><Field label="Google Email" status={validEmail(googleEmail)}><Input type="email" value={googleEmail} onChange={(e) => setGoogleEmail(e.target.value)} dir="ltr" /></Field><Field label="المنصب" status={!!position.trim()}><Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="مثال: Senior Advocate" /></Field><Field label="المجال / التخصص" status={!!specialization.trim()}><Input value={specialization} onChange={(e) => setSpecialization(e.target.value)} /></Field></div><Field label="نبذة" status={!!bio.trim()}><Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="min-h-[90px]" /></Field></form></Modal>;
}
