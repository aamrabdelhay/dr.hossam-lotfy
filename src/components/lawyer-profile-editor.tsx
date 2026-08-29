'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Pencil } from 'lucide-react';
import { Button, Field, Input, Modal, Select, Textarea } from './ui';
import { toastSuccess, toastError } from './toasts';

/** Lawyer self-service profile editor. Administrative controls remain server-protected. */
export function LawyerProfileEditor({
  lawyerId,
  fullName,
  title,
  phone,
  email,
  googleEmail,
  specialization,
  bio,
  position,
  profilePhotoUrl,
  coverPhotoUrl,
}: {
  lawyerId: string;
  fullName: string;
  title: 'DOCTOR' | 'ADVOCATE';
  phone: string | null;
  email: string | null;
  googleEmail: string | null;
  specialization: string | null;
  bio: string | null;
  position: string | null;
  profilePhotoUrl: string | null;
  coverPhotoUrl: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [fullNameVal, setFullNameVal] = React.useState(fullName);
  const [titleVal, setTitleVal] = React.useState<'DOCTOR' | 'ADVOCATE'>(title);
  const [phoneVal, setPhoneVal] = React.useState(phone ?? '');
  const [emailVal, setEmailVal] = React.useState(email ?? '');
  const [googleEmailVal, setGoogleEmailVal] = React.useState(googleEmail ?? '');
  const [specializationVal, setSpecializationVal] = React.useState(specialization ?? '');
  const [bioVal, setBioVal] = React.useState(bio ?? '');
  const [positionVal, setPositionVal] = React.useState(position ?? '');
  const [photoVal, setPhotoVal] = React.useState(profilePhotoUrl ?? '');
  const [coverVal, setCoverVal] = React.useState(coverPhotoUrl ?? '');
  const [busy, setBusy] = React.useState(false);

  const openEditor = () => {
    setFullNameVal(fullName);
    setTitleVal(title);
    setPhoneVal(phone ?? '');
    setEmailVal(email ?? '');
    setGoogleEmailVal(googleEmail ?? '');
    setSpecializationVal(specialization ?? '');
    setBioVal(bio ?? '');
    setPositionVal(position ?? '');
    setPhotoVal(profilePhotoUrl ?? '');
    setCoverVal(coverPhotoUrl ?? '');
    setOpen(true);
  };

  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/lawyers/${lawyerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullNameVal.trim(),
          title: titleVal,
          phone: phoneVal.trim() || null,
          email: emailVal.trim() || null,
          googleEmail: googleEmailVal.trim() || null,
          specialization: specializationVal.trim() || null,
          bio: bioVal.trim() || null,
          position: positionVal.trim() || null,
          profilePhotoUrl: photoVal.trim() || null,
          coverPhotoUrl: coverVal.trim() || null,
        }),
      });
      if (res.ok) {
        setOpen(false);
        toastSuccess('تم حفظ تعديلات صفحتك ✓');
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        toastError(d.error ?? 'تعذر حفظ التعديلات.');
      }
    } catch {
      toastError('تعذر الاتصال بالخادم. حاول مرة أخرى.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button onClick={openEditor} className="flex items-center gap-1.5 border border-[#242424] px-3 py-1.5 text-[10px] tracking-[1.5px] uppercase text-[#242424] transition-colors hover:bg-[#242424] hover:text-[#F7F5F0]" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif', letterSpacing: '1.5px' }}>
        <Pencil size={11} /> تعديل صفحتي
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`تعديل صفحتي — ${fullName}`} wide footer={
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button><Button onClick={() => void save()} disabled={busy}>{busy && <Loader2 size={14} className="animate-spin" />}حفظ التعديلات</Button></div>
      }>
        <div className="space-y-4">
          <p className="text-[12px] font-semibold leading-6 text-navy-400">يمكنك تعديل بيانات ملفك الشخصي بالكامل. إعدادات الإدارة مثل تفعيل الحساب وترتيب ظهوره تظل للإدارة فقط.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="الصفة" required><Select value={titleVal} onChange={(e) => setTitleVal(e.target.value as 'DOCTOR' | 'ADVOCATE')}><option value="ADVOCATE">محامي</option><option value="DOCTOR">دكتور</option></Select></Field>
            <Field label="الاسم الكامل" required><Input value={fullNameVal} onChange={(e) => setFullNameVal(e.target.value)} /></Field>
            <Field label="الهاتف" hint="اختياري"><Input value={phoneVal} onChange={(e) => setPhoneVal(e.target.value)} placeholder="01xxxxxxxxx" dir="ltr" /></Field>
            <Field label="البريد الإلكتروني" hint="اختياري"><Input type="email" value={emailVal} onChange={(e) => setEmailVal(e.target.value)} dir="ltr" /></Field>
            <Field label="Google Email" hint="اختياري"><Input type="email" value={googleEmailVal} onChange={(e) => setGoogleEmailVal(e.target.value)} dir="ltr" /></Field>
            <Field label="المنصب" hint="اختياري"><Input value={positionVal} onChange={(e) => setPositionVal(e.target.value)} placeholder="مثال: Senior Advocate" /></Field>
            <Field label="المجال / التخصص" hint="اختياري"><Input value={specializationVal} onChange={(e) => setSpecializationVal(e.target.value)} /></Field>
            <Field label="رابط الصورة الشخصية" hint="اختياري"><Input value={photoVal} onChange={(e) => setPhotoVal(e.target.value)} placeholder="https://…" dir="ltr" /></Field>
          </div>
          <Field label="رابط صورة الغلاف" hint="اختياري"><Input value={coverVal} onChange={(e) => setCoverVal(e.target.value)} placeholder="https://…" dir="ltr" /></Field>
          <Field label="النبذة التعريفية" hint="اختياري"><Textarea value={bioVal} onChange={(e) => setBioVal(e.target.value)} className="min-h-[100px]" placeholder="نبذة قصيرة عن خبراتك ومجالات عملك…" /></Field>
        </div>
      </Modal>
    </>
  );
}
