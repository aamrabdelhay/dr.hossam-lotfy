'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Pencil } from 'lucide-react';
import { Button, Field, Input, Modal, Textarea } from './ui';
import { toastSuccess, toastError } from './toasts';

/**
 * «تعديل صفحتي» — المحامي يعدّل ملفه الشخصي بنفسه (الهاتف، التخصص،
 * النبذة، الصورة الشخصية). باقي الحقول (الاسم، الصفة، الترتيب…) تبقى
 * للأدمن فقط — server-enforced في PATCH /api/lawyers/[id].
 */
export function LawyerProfileEditor({
  lawyerId,
  fullName,
  phone,
  specialization,
  bio,
  profilePhotoUrl,
}: {
  lawyerId: string;
  fullName: string;
  phone: string | null;
  specialization: string | null;
  bio: string | null;
  profilePhotoUrl: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [phoneVal, setPhoneVal] = React.useState(phone ?? '');
  const [specializationVal, setSpecializationVal] = React.useState(specialization ?? '');
  const [bioVal, setBioVal] = React.useState(bio ?? '');
  const [photoVal, setPhotoVal] = React.useState(profilePhotoUrl ?? '');
  const [busy, setBusy] = React.useState(false);

  const openEditor = () => {
    setPhoneVal(phone ?? '');
    setSpecializationVal(specialization ?? '');
    setBioVal(bio ?? '');
    setPhotoVal(profilePhotoUrl ?? '');
    setOpen(true);
  };

  const save = async () => {
    setBusy(true);
    const res = await fetch(`/api/lawyers/${lawyerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: phoneVal.trim() || null,
        specialization: specializationVal.trim() || null,
        bio: bioVal.trim() || null,
        profilePhotoUrl: photoVal.trim() || null,
      }),
    });
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      toastSuccess('تم حفظ تعديلات صفحتك ✓');
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      toastError(d.error ?? 'تعذر حفظ التعديلات.');
    }
  };

  return (
    <>
      <button
        onClick={openEditor}
        className="flex items-center gap-1.5 border border-white/15 px-3 py-1.5 text-[10px] tracking-[1.5px] uppercase text-ivory-200 transition-colors hover:bg-white/10 hover:text-ivory-50"
        style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif', letterSpacing: '1.5px' }}
      >
        <Pencil size={11} />
        تعديل صفحتي
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`تعديل صفحتي — ${fullName}`} wide
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={() => void save()} disabled={busy}>
              {busy && <Loader2 size={14} className="animate-spin" />}
              حفظ التعديلات
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-[12px] font-semibold leading-6 text-navy-400">
            يمكنك تعديل بيانات صفحتك بنفسك: الهاتف، التخصص، النبذة التعريفية، ورابط الصورة الشخصية.
            تعديل الاسم والصفة والترتيب يتم عبر الإدارة.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="الهاتف" hint="اختياري">
              <Input value={phoneVal} onChange={(e) => setPhoneVal(e.target.value)} placeholder="02xxxxxxx / 01xxxxxxxxx" dir="ltr" />
            </Field>
            <Field label="التخصص" hint="يظهر أعلى صفحتك">
              <Input value={specializationVal} onChange={(e) => setSpecializationVal(e.target.value)} placeholder="مثال: القضايا المدنية والتجارية" />
            </Field>
          </div>
          <Field label="النبذة التعريفية" hint="اختياري — تظهر تحت الاسم">
            <Textarea value={bioVal} onChange={(e) => setBioVal(e.target.value)} className="min-h-[80px]" placeholder="نبذة قصيرة عن خبراتك ومجالات عملك…" />
          </Field>
          <Field label="رابط الصورة الشخصية" hint="اختياري — URL لصورة">
            <Input value={photoVal} onChange={(e) => setPhotoVal(e.target.value)} placeholder="https://…" dir="ltr" />
          </Field>
        </div>
      </Modal>
    </>
  );
}
