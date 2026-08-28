'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Database, Loader2, RotateCcw, Trash2, TriangleAlert, LockKeyhole } from 'lucide-react';
import { Button, Modal } from '../ui';
import { toastError, toastSuccess } from '../toasts';

type DemoStatus = {
  demoPresent: boolean;
  demoLocked?: boolean;
  counts: { lawyers: number; tasks: number; cases: number; comments: number; notifications: number; activity: number };
};

export function DemoDataToggle() {
  const router = useRouter();
  const [status, setStatus] = React.useState<DemoStatus | null>(null);
  const [pending, setPending] = React.useState<null | 'clear' | 'restore' | 'lock'>(null);
  const [busy, setBusy] = React.useState(false);

  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch('/api/admin/demo', { cache: 'no-store' });
      if (res.ok) setStatus(await res.json());
    } catch {
      // Non-critical: the buttons still work without the counts.
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const run = async (action: 'clear' | 'restore' | 'lock') => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, confirm: true }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        toastSuccess(d.message ?? 'تم التنفيذ ✓');
        setStatus(d.status ? { ...d.status, demoLocked: d.demoLocked } : null);
        setPending(null);
        router.refresh();
      } else {
        toastError(d.error ?? 'تعذر تنفيذ الإجراء.');
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'تعذر الاتصال بالخادم.');
    }
    setBusy(false);
  };

  const total = status ? status.counts.tasks + status.counts.cases + status.counts.lawyers : 0;
  const locked = status?.demoLocked === true;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {!locked && (
          <>
            <button
              onClick={() => setPending('clear')}
              className="flex items-center gap-2 rounded-full border border-red-500/40 bg-red-600/10 px-4 py-2 text-[12px] font-extrabold text-red-300 transition hover:bg-red-600/20"
              title="حذف بيانات الاختبار فقط مع إبقاء الموقع قابلاً للتبديل"
            >
              <Trash2 size={14} />
              مسح بيانات الاختبار
            </button>
            <button
              onClick={() => setPending('restore')}
              className="flex items-center gap-2 rounded-full border border-gold-500/40 bg-gold-500/10 px-4 py-2 text-[12px] font-extrabold text-gold-300 transition hover:bg-gold-500/20"
              title="إعادة إنشاء بيانات تجريبية للتجربة"
            >
              <RotateCcw size={14} />
              تشغيل الديمو
            </button>
            <button
              onClick={() => setPending('lock')}
              className="flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-[12px] font-extrabold text-emerald-300 transition hover:bg-emerald-500/20"
              title="مسح بيانات الديمو وقفل وضع الديمو نهائياً للتشغيل الفعلي"
            >
              <LockKeyhole size={14} />
              تشغيل فعلي نهائي
            </button>
          </>
        )}
        {locked && (
          <span className="flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-[12px] font-extrabold text-emerald-300">
            <LockKeyhole size={14} />
            التشغيل الفعلي مفعّل نهائياً — الديمو مغلق
          </span>
        )}
        {status && !locked && (
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-ivory-300/70">
            <Database size={12} />
            {total > 0
              ? `${status.counts.tasks} مهمة · ${status.counts.cases} قضية · ${status.counts.lawyers} محامٍ`
              : 'قاعدة البيانات فارغة من بيانات التشغيل'}
          </span>
        )}
      </div>

      <Modal
        open={pending !== null}
        onClose={() => !busy && setPending(null)}
        title={pending === 'lock' ? 'تحويل الموقع للتشغيل الفعلي نهائياً' : pending === 'clear' ? 'مسح بيانات الاختبار' : 'استرجاع بيانات الاختبار'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPending(null)} disabled={busy}>
              إلغاء
            </Button>
            <Button
              variant={pending === 'clear' ? 'danger' : pending === 'lock' ? 'primary' : 'primary'}
              onClick={() => pending && run(pending)}
              disabled={busy}
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <TriangleAlert size={14} />}
              {pending === 'clear' ? 'نعم، امسح بيانات الاختبار' : pending === 'lock' ? 'نعم، شغّل الموقع فعلياً نهائياً' : 'نعم، استرجع البيانات'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-[13px] font-semibold leading-7 text-navy-700">
          {pending === 'lock' ? (
            <>
              <p className="font-extrabold text-navy-900">هذا هو زر الانتقال النهائي للتشغيل الفعلي.</p>
              <ul className="list-inside list-disc text-navy-600">
                <li>سيتم حذف بيانات الديمو فقط قبل التشغيل الفعلي.</li>
                <li>سيتم تعطيل وضع الديمو نهائياً على مستوى الموقع وقاعدة البيانات.</li>
                <li>سيتم إخفاء أزرار تشغيل/استرجاع الديمو بعد التنفيذ.</li>
                <li>لن يستطيع أي مستخدم إعادة تشغيل الديمو من الموقع بعد ذلك.</li>
              </ul>
              <p className="rounded-xl bg-red-500/10 px-3 py-2 text-[12.5px] text-red-800">
                هذا الإجراء نهائي ولا يوجد زر تراجع له. استخدمه فقط عندما تكون جاهزاً للتشغيل الفعلي.
              </p>
            </>
          ) : pending === 'clear' ? (
            <>
              <p>سيتم حذف بيانات الاختبار فقط، مع إبقاء الموقع قابلاً للتبديل بين الديمو والعادي.</p>
              <p className="rounded-xl bg-emerald-600/[0.08] px-3 py-2 text-[12.5px] text-emerald-800">
                حسابات الدخول ودليل المحاكم والأماكن لا يتم حذفها.
              </p>
            </>
          ) : (
            <>
              <p>سيتم مسح البيانات الحالية ثم إنشاء مجموعة بيانات تجريبية ثابتة للتجربة.</p>
              <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-[12.5px] text-amber-800">
                استخدم الديمو للتجربة فقط — قبل التشغيل الفعلي استخدم زر «تشغيل فعلي نهائي» لمسح بياناته وقفل الديمو نهائياً.
              </p>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}