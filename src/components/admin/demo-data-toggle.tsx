'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Database, Loader2, RotateCcw, Trash2, TriangleAlert } from 'lucide-react';
import { Button, Modal } from '../ui';
import { toastError, toastSuccess } from '../toasts';

type DemoStatus = {
  demoPresent: boolean;
  counts: { lawyers: number; tasks: number; cases: number; comments: number; notifications: number; activity: number };
};

/**
 * «مسح بيانات الاختبار» / «استرجاع البيانات»
 *
 * One control with two directions so the office can switch the platform
 * between a real, production run and a sandbox to try things out. Both
 * directions are destructive, so both go through an explicit confirmation that
 * spells out exactly what is removed and what is kept.
 */
export function DemoDataToggle() {
  const router = useRouter();
  const [status, setStatus] = React.useState<DemoStatus | null>(null);
  const [pending, setPending] = React.useState<null | 'clear' | 'restore'>(null);
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

  const run = async (action: 'clear' | 'restore') => {
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
        setStatus(d.status ?? null);
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

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setPending('clear')}
          className="flex items-center gap-2 rounded-full border border-red-500/40 bg-red-600/10 px-4 py-2 text-[12px] font-extrabold text-red-300 transition hover:bg-red-600/20"
          title="حذف كل المهام والقضايا والمحامين — مع الإبقاء على حسابات الدخول ودليل الأماكن"
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
          استرجاع البيانات
        </button>
        {status && (
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
        title={pending === 'clear' ? 'مسح بيانات الاختبار' : 'استرجاع بيانات الاختبار'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPending(null)} disabled={busy}>
              إلغاء
            </Button>
            <Button
              variant={pending === 'clear' ? 'danger' : 'primary'}
              onClick={() => pending && run(pending)}
              disabled={busy}
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <TriangleAlert size={14} />}
              {pending === 'clear' ? 'نعم، امسح كل البيانات' : 'نعم، استرجع البيانات'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-[13px] font-semibold leading-7 text-navy-700">
          {pending === 'clear' ? (
            <>
              <p>سيتم حذف كل بيانات التشغيل الحالية نهائياً:</p>
              <ul className="list-inside list-disc text-navy-600">
                <li>كل المهام والجلسات وإسنادها ({status?.counts.tasks ?? '—'})</li>
                <li>كل ملفات القضايا وسجل أحداثها ({status?.counts.cases ?? '—'})</li>
                <li>كل ملفات المحامين ({status?.counts.lawyers ?? '—'})</li>
                <li>التعليقات والإشعارات وسجل النشاط</li>
              </ul>
              <p className="rounded-xl bg-emerald-600/[0.08] px-3 py-2 text-[12.5px] text-emerald-800">
                لن يتم المساس بحسابات الدخول (الإدارة) ولا بدليل المحاكم والأماكن — تقدر تسجّل دخول عادي بعدها.
              </p>
            </>
          ) : (
            <>
              <p>سيتم مسح البيانات الحالية أولاً ثم إنشاء مجموعة بيانات تجريبية ثابتة (محامون، قضايا، جلسات سابقة وقادمة).</p>
              <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-[12.5px] text-amber-800">
                استخدمها للتجربة فقط — أي بيانات حقيقية موجودة الآن ستُحذف.
              </p>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
