'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, X } from 'lucide-react';
import { Button, Field, Input, Modal, Select, Textarea } from '../ui';
import { toastSuccess, toastError } from '../toasts';
import { DISTANCE_BUCKETS, LOCATION_TYPE_LABEL, type NavLocation } from '@/lib/constants';

const TYPES = Object.keys(LOCATION_TYPE_LABEL) as Array<keyof typeof LOCATION_TYPE_LABEL>;

/** Egyptian governorates — used by the admin form and the public filters. */
export const GOVERNORATES = [
  'القاهرة', 'الجيزة', 'القليوبية', 'الإسكندرية', 'البحيرة', 'الغربية', 'المنوفية', 'الدقهلية',
  'كفر الشيخ', 'الشرقية', 'دمياط', 'بورسعيد', 'الإسماعيلية', 'السويس', 'شمال سيناء', 'جنوب سيناء',
  'البحر الأحمر', 'مطروح', 'الفيوم', 'بني سويف', 'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'الأقصر',
  'أسوان', 'الوادي الجديد',
] as const;

/** A location row as managed inside the admin area (superset of NavLocation). */
export type AdminLocationRow = NavLocation & {
  nameEn?: string | null;
  city?: string | null;
  district?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  googleMapsUrl?: string | null;
  workingHours?: string | null;
  jurisdiction?: string | null;
  distanceBucket?: string | null;
  services?: string[];
  description?: string | null;
};

const str = (v: string | null | undefined) => v ?? '';

export function LocationForm({
  open,
  onClose,
  location,
}: {
  open: boolean;
  onClose: () => void;
  location?: AdminLocationRow | null;
}) {
  const router = useRouter();
  const [name, setName] = React.useState('');
  const [nameEn, setNameEn] = React.useState('');
  const [type, setType] = React.useState<string>('COURT');
  const [subType, setSubType] = React.useState('');
  const [governorate, setGovernorate] = React.useState('');
  const [city, setCity] = React.useState('');
  const [district, setDistrict] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [workingHours, setWorkingHours] = React.useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = React.useState('');
  const [distanceBucket, setDistanceBucket] = React.useState('');
  const [services, setServices] = React.useState<string[]>([]);
  const [serviceDraft, setServiceDraft] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setName(str(location?.name));
    setNameEn(str(location?.nameEn));
    setType(location?.type ?? 'COURT');
    setSubType(str(location?.subType));
    setGovernorate(str(location?.governorate));
    setCity(str(location?.city));
    setDistrict(str(location?.district));
    setAddress(str(location?.address));
    setPhone(str(location?.phone));
    setEmail(str(location?.email));
    setWorkingHours(str(location?.workingHours));
    setGoogleMapsUrl(str(location?.googleMapsUrl));
    setDistanceBucket(str(location?.distanceBucket));
    setServices(location?.services ?? []);
    setServiceDraft('');
    setDescription(str(location?.description));
  }, [open, location]);

  const addService = () => {
    const v = serviceDraft.trim();
    if (!v) return;
    if (!services.includes(v)) setServices([...services, v]);
    setServiceDraft('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toastError('اسم المكان مطلوب.');
      return;
    }
    setBusy(true);
    const isEdit = !!location?.id;
    // The API accepts null to clear a field on PATCH, and omits empties on POST.
    const val = (v: string) => (v.trim() ? v.trim() : isEdit ? null : undefined);
    const res = await fetch(isEdit ? `/api/locations/${location!.id}` : '/api/locations', {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        type,
        nameEn: val(nameEn),
        subType: val(subType),
        governorate: val(governorate),
        city: val(city),
        district: val(district),
        address: val(address),
        phone: val(phone),
        email: val(email),
        workingHours: val(workingHours),
        googleMapsUrl: val(googleMapsUrl),
        distanceBucket: val(distanceBucket),
        services,
        description: val(description),
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
      wide
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="اسم المكان" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: محكمة جنوب القاهرة الابتدائية" />
          </Field>
          <Field label="الاسم بالإنجليزية" hint="اختياري — يحسّن البحث">
            <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} dir="ltr" className="ltr text-start" placeholder="South Cairo Primary Court" />
          </Field>
          <Field label="النوع" required>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => (
                <option key={t} value={t}>{LOCATION_TYPE_LABEL[t]}</option>
              ))}
            </Select>
          </Field>
          <Field label="النوع الفرعي" hint="مثال: ابتدائية / جزئية / استئناف">
            <Input value={subType} onChange={(e) => setSubType(e.target.value)} placeholder="ابتدائية" />
          </Field>
          <Field label="المحافظة">
            <Select value={governorate} onChange={(e) => setGovernorate(e.target.value)}>
              <option value="">— اختر المحافظة —</option>
              {GOVERNORATES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
              {governorate && !(GOVERNORATES as readonly string[]).includes(governorate) && (
                <option value={governorate}>{governorate}</option>
              )}
            </Select>
          </Field>
          <Field label="المدينة">
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="مثال: الجيزة" />
          </Field>
          <Field label="الحي / المنطقة">
            <Input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="مثال: الدقي" />
          </Field>
          <Field label="بُعد المسافة عن المكتب" hint="اختياري">
            <Select value={distanceBucket} onChange={(e) => setDistanceBucket(e.target.value)}>
              <option value="">— غير محدد —</option>
              {DISTANCE_BUCKETS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </Select>
          </Field>
          <Field label="التليفون">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" className="ltr text-start" placeholder="+20 2 …" />
          </Field>
          <Field label="البريد الإلكتروني">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" className="ltr text-start" placeholder="info@example.gov.eg" />
          </Field>
          <Field label="مواعيد العمل">
            <Input value={workingHours} onChange={(e) => setWorkingHours(e.target.value)} placeholder="الأحد–الخميس 9ص–2م" />
          </Field>
          <Field label="رابط خرائط جوجل">
            <Input value={googleMapsUrl} onChange={(e) => setGoogleMapsUrl(e.target.value)} dir="ltr" className="ltr text-start" placeholder="https://maps.google.com/…" />
          </Field>
        </div>

        <Field label="العنوان" hint="اختياري">
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="العنوان بالتفصيل" />
        </Field>

        <Field label="الخدمات" hint="اكتب الخدمة واضغط + إضافة">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={serviceDraft}
                onChange={(e) => setServiceDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addService();
                  }
                }}
                placeholder="مثال: استخراج شهادة ميلاد"
              />
              <Button variant="outline" onClick={addService}>
                <Plus size={14} />
                إضافة
              </Button>
            </div>
            {services.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {services.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-bold text-ivory-300">
                    {s}
                    <button type="button" onClick={() => setServices(services.filter((x) => x !== s))} className="text-navy-300 hover:text-red-600" title="حذف">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </Field>

        <Field label="وصف" hint="اختياري">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[60px]" />
        </Field>

        <p className="rounded-lg bg-navy-800 px-3 py-2 text-[11px] font-bold leading-5 text-navy-400">
          بمجرد الإضافة تُنشأ صفحة مستقلة للمكان تلقائياً (/locations/…) ويبدأ سجلها الزمني.
        </p>
      </form>
    </Modal>
  );
}
