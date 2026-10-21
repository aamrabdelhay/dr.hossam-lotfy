'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, Loader2, Save, Trash2 } from 'lucide-react';

const MAX_BYTES = 500 * 1024;

export function SiteBrandingSettings() {
  const router = useRouter();
  const [current, setCurrent] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<string | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch('/api/admin/site-branding', { cache: 'no-store' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'تعذر تحميل شعار المكتب.');
        if (!cancelled) {
          setCurrent(data.logoDataUrl || null);
          setDraft(data.logoDataUrl || null);
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'تعذر تحميل شعار المكتب.');
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const onChoose = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setNotice('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('استخدم شعارًا بصيغة PNG أو JPG أو WebP.');
      return;
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      setError('يجب ألا يتجاوز حجم الشعار 500 كيلوبايت.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setDraft(reader.result);
      else setError('تعذر قراءة ملف الشعار.');
    };
    reader.onerror = () => setError('تعذر قراءة ملف الشعار.');
    reader.readAsDataURL(file);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/site-branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoDataUrl: draft }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'تعذر حفظ الشعار.');
      setCurrent(data.logoDataUrl || null);
      setDraft(data.logoDataUrl || null);
      setNotice(draft ? 'تم حفظ شعار المكتب وسيظهر في شريط الموقع.' : 'تمت إزالة الشعار المخصص والعودة إلى الشعار الافتراضي.');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر حفظ شعار المكتب.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mb-5 rounded-2xl border border-navy-100 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-50 text-navy-700"><ImagePlus size={18} /></span>
        <div>
          <h2 className="font-extrabold text-navy-950">هوية الموقع وشعار المكتب</h2>
          <p className="mt-1 text-xs leading-6 text-navy-400">ارفع شعار المكتب ليظهر بدل العلامة الافتراضية في شريط التنقل. الصيغ المدعومة PNG وJPG وWebP، بحد أقصى 500 كيلوبايت.</p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-navy-100 bg-ivory-50 p-2">
          {draft ? <img src={draft} alt="معاينة شعار المكتب" className="max-h-full max-w-full object-contain" /> : <span className="text-sm font-black text-gold-700">LL</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-navy-200 bg-white px-4 py-2.5 text-xs font-bold text-navy-800">
            <ImagePlus size={15} /> اختيار شعار
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onChoose} disabled={!loaded || saving} />
          </label>
          {draft && <button type="button" onClick={() => { setDraft(null); setError(''); setNotice(''); }} disabled={saving} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-xs font-bold text-red-700 disabled:opacity-50"><Trash2 size={15} /> إزالة الشعار</button>}
          <button type="button" onClick={save} disabled={!loaded || saving || draft === current} className="inline-flex items-center gap-2 rounded-xl bg-navy-950 px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}{saving ? 'جارٍ الحفظ…' : 'حفظ الهوية'}
          </button>
        </div>
      </div>
      {error && <p role="alert" className="mt-3 text-xs leading-6 text-red-700">{error}</p>}
      {notice && <p role="status" className="mt-3 text-xs leading-6 text-emerald-700">{notice}</p>}
    </section>
  );
}
