'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import { Avatar, Badge, Button, Card, EmptyState } from '../ui';
import { toastSuccess, toastError } from '../toasts';
type LawyerAdminRow = { id: string; fullName: string; email: string | null; googleEmail: string | null; active: boolean; isAdmin: boolean; approvedAt: string | null };
export function UsersTab({ currentUserId }: { currentUserId: string }) {
  const router = useRouter();
  const [lawyers, setLawyers] = React.useState<LawyerAdminRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);
  const load = React.useCallback(async () => { setLoading(true); const res = await fetch('/api/lawyers?admin=1', { cache: 'no-store' }); if (res.ok) { const d = await res.json(); setLawyers((d.lawyers ?? []) as LawyerAdminRow[]); } else { const d = await res.json().catch(() => ({})); toastError(d.error ?? 'تعذر تحميل المحامين.'); } setLoading(false); }, []);
  React.useEffect(() => { void load(); }, [load]);
  const toggle = async (lawyer: LawyerAdminRow) => { const email = lawyer.googleEmail || lawyer.email; if (!email) { toastError('أضف بريداً إلكترونياً للمحامي أولاً.'); return; } setBusy(lawyer.id); const res = await fetch(`/api/lawyers/${lawyer.id}/admin`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isAdmin: !lawyer.isAdmin }) }); const d = await res.json().catch(() => ({})); setBusy(null); if (!res.ok) { toastError(d.error ?? 'تعذر تعديل صلاحية الادمن.'); return; } toastSuccess(lawyer.isAdmin ? 'تمت إزالة صلاحية الادمن.' : 'تم منح المحامي صلاحية الادمن ✓'); await load(); router.refresh(); };
  return <div className="space-y-4"><div><p className="text-[13px] font-bold text-navy-500">الادمن</p><p className="mt-0.5 text-[11px] font-semibold text-navy-300">من هنا تمنح أو تزيل صلاحية الإدارة لأي حساب محامٍ.</p></div>{loading ? <EmptyState title="جارٍ التحميل…" /> : lawyers.length === 0 ? <EmptyState title="لا يوجد محامون" /> : <Card className="divide-y divide-navy-100">{lawyers.map((lawyer) => { const email = lawyer.googleEmail || lawyer.email; return <div key={lawyer.id} className="flex flex-wrap items-center gap-3 px-4 py-3"><Avatar name={lawyer.fullName} size={40} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-[13.5px] font-extrabold text-navy-950">{lawyer.fullName}</p>{lawyer.isAdmin && <Badge tone="gold"><ShieldCheck size={11} /> ادمن</Badge>}{lawyer.id === currentUserId && <Badge tone="navy">أنت</Badge>}</div><p className="ltr mt-0.5 truncate text-start font-latin text-[11.5px] font-semibold text-navy-400" dir="ltr">{email || 'بدون بريد إلكتروني'}</p></div><Button size="sm" variant={lawyer.isAdmin ? 'outline' : 'gold'} onClick={() => void toggle(lawyer)} disabled={busy === lawyer.id || !email}>{busy === lawyer.id ? 'جارٍ الحفظ…' : lawyer.isAdmin ? <><ShieldOff size={14} /> إزالة الادمن</> : <><ShieldCheck size={14} /> جعل ادمن</>}</Button></div>; })}</Card>}</div>;
}
