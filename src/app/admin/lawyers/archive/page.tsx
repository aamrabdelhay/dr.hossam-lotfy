'use client';

import * as React from 'react';
import Link from 'next/link';
import { Archive, ArrowRight, RotateCcw, UserRound } from 'lucide-react';
import { Card, EmptyState, Button, Badge } from '@/components/ui';
import { toastError, toastSuccess } from '@/components/toasts';

type ArchivedLawyer = {
  id: string;
  slug: string;
  fullName: string;
  email: string | null;
  googleEmail: string | null;
  phone: string | null;
  specialization: string | null;
  approvedAt: string | null;
  updatedAt: string;
  active: boolean;
};

export default function ArchivedLawyersPage() {
  const [items, setItems] = React.useState<ArchivedLawyer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/lawyers?active=false', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setItems((data.lawyers ?? []).filter((l: ArchivedLawyer) => !l.active));
    } else {
      toastError('تعذر تحميل أرشيف المحامين.');
    }
    setLoading(false);
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const restore = async (lawyer: ArchivedLawyer) => {
    setBusy(lawyer.id);
    const res = await fetch(`/api/lawyers/${lawyer.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: true }),
    });
    setBusy(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toastError(data.error ?? 'تعذر استرجاع المحامي.');
      return;
    }
    toastSuccess(`تم استرجاع ${lawyer.fullName} ✓`);
    setItems((current) => current.filter((x) => x.id !== lawyer.id));
  };

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin?tab=lawyers" className="mb-3 inline-flex items-center gap-1 text-[11px] font-bold text-navy-400 hover:text-gold-700">
            <ArrowRight size={13} /> العودة إلى المحامين
          </Link>
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-navy-950">
            <Archive size={20} className="text-gold-600" />
            أرشيف المحامين المحذوفين
          </h1>
          <p className="mt-1 text-[12.5px] font-medium text-navy-400">
            المحامي المعطّل يبقى محفوظاً هنا ولا يستطيع تسجيل الدخول حتى يتم استرجاعه.
          </p>
        </div>
        <Badge tone="gray">{items.length} محامي</Badge>
      </div>

      {loading ? (
        <EmptyState title="جارٍ التحميل…" />
      ) : items.length === 0 ? (
        <EmptyState title="أرشيف المحامين فارغ" hint="المحامون الذين يتم تعطيلهم سيظهرون هنا ويمكن استرجاعهم لاحقاً." />
      ) : (
        <div className="space-y-3">
          {items.map((lawyer) => (
            <Card key={lawyer.id} className="flex flex-wrap items-center gap-3 p-4">
              <span className="masthead flex h-11 w-11 items-center justify-center rounded-xl text-[var(--masthead-accent)]">
                <UserRound size={19} />
              </span>
              <div className="min-w-0 flex-1">
                <Link href={`/lawyers/${lawyer.slug}`} className="text-[14px] font-extrabold text-navy-950 hover:underline">
                  {lawyer.fullName}
                </Link>
                <p className="mt-1 text-[11px] font-semibold text-navy-400">
                  {lawyer.googleEmail || lawyer.email || 'بدون بريد'}
                  {lawyer.phone ? ` · ${lawyer.phone}` : ''}
                  {lawyer.specialization ? ` · ${lawyer.specialization}` : ''}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => restore(lawyer)} disabled={busy === lawyer.id}>
                <RotateCcw size={13} />
                {busy === lawyer.id ? 'جارٍ الاسترجاع…' : 'استرجاع المحامي'}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
