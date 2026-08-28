'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, Modal, Select } from '../ui';
import { toastSuccess, toastError } from '../toasts';
import { ASSIGNABLE_ROLES, ROLE_DESCRIPTION, ROLE_LABEL } from '@/lib/constants';
import { formatDateTime } from '@/lib/dates';

export type StaffUserRow = { id: string; name: string; email: string; role: string; createdAt: string };
type LawyerOption = { id: string; fullName: string; email: string | null; googleEmail: string | null; active: boolean; approvedAt: string | null };
const isSuper = (role: string) => role === 'SUPER_ADMIN' || role === 'ADMIN';

export function UsersTab({ currentUserId }: { currentUserId: string }) {
  const router = useRouter();
  const [users, setUsers] = React.useState<StaffUserRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<StaffUserRow | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState<StaffUserRow | null>(null);
  const [busy, setBusy] = React.useState(false);
  const load = React.useCallback(async () => { setLoading(true); const res = await fetch('/api/users', { cache: 'no-store' }); if (res.ok) { const d = await res.json(); setUsers(d.users ?? []); } else { const d = await res.json().catch(() => ({})); toastError(d.error ?? 'تعذر تحميل الحسابات.'); } setLoading(false); }, []);
  React.useEffect(() => { void load(); }, [load]);
  const remove = async () => { if (!confirmDelete) return; setBusy(true); const res = await fetch(`/api/users/${confirmDelete.id}`, { method: 'DELETE' }); setBusy(false); const d = await res.json().catch(() => ({})); if (res.ok) { toastSuccess('تم حذف الحساب.'); setConfirmDelete(null); void load(); router.refresh(); } else { toastError(d.error ?? 'تعذر الحذف.'); setConfirmDelete(null); } };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-[13px] font-bold text-navy-500">{users.length} حساب — المدير العام وحده يضيف أو يعدّل الحسابات</p><p className="mt-0.5 text-[11px] font-semibold text-navy-300">اختر المحامي وسيتم إنشاء حسابه تلقائياً بالاسم والبريد، بدون إدخال بيانات يدوية.</p></div>
        <Button size="sm" onClick={() => setCreating(true)}><UserPlus size={14} />+ إضافة مستخدم</Button>
      </div>
      {loading ? <EmptyState title="جارٍ التحميل…" /> : users.length === 0 ? <EmptyState title="لا توجد حسابات" hint="أضف حساباً لفريق المكتب وحدد دوره." /> : (
        <Card className="divide-y divide-navy-100">{users.map((u) => <div key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3"><Avatar name={u.name} size={38} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-[13.5px] font-extrabold text-navy-950">{u.name}</p><Badge tone={isSuper(u.role) ? 'gold' : 'outline'}>{isSuper(u.role) && <ShieldCheck size={11} />}{ROLE_LABEL[u.role] ?? u.role}</Badge>{u.id === currentUserId && <Badge tone="navy">أنت</Badge>}</div><p className="ltr mt-0.5 truncate text-start font-latin text-[11.5px] font-semibold text-navy-400" dir="ltr">{u.email}</p><p className="mt-0.5 text-[10.5px] font-semibold text-navy-300">{ROLE_DESCRIPTION[u.role] ?? ''} — أُنشئ {formatDateTime(new Date(u.createdAt))}</p></div>{isSuper(u.role) ? <span className="text-[11px] font-bold text-navy-300">حساب محمي</span> : <><button onClick={() => setEditing(u)} className="rounded-md p-2 text-navy-400 hover:bg-navy-900/5 hover:text-navy-800" title="تعديل"><Pencil size={14} /></button><button onClick={() => setConfirmDelete(u)} className="rounded-md p-2 text-navy-300 hover:bg-red-600/10 hover:text-red-600" title="حذف"><Trash2 size={14} /></button></>}</div>)}</Card>
      )}
      <UserForm open={creating || !!editing} user={editing} onClose={() => { setCreating(false); setEditing(null); }} onSaved={() => { setCreating(false); setEditing(null); void load(); router.refresh(); }} />
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="تأكيد حذف الحساب" footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setConfirmDelete(null)}>إلغاء</Button><Button variant="danger" onClick={remove} disabled={busy}>حذف</Button></div>}><p className="text-sm leading-7 text-navy-700">سيتم إنهاء جلسات «{confirmDelete?.name}» وحذف حسابه نهائياً. سجل النشاط الخاص به يبقى محفوظاً.</p></Modal>
    </div>
  );
}

function UserForm({ open, user, onClose, onSaved }: { open: boolean; user: StaffUserRow | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!user;
  const [lawyers, setLawyers] = React.useState<LawyerOption[]>([]);
  const [lawyerId, setLawyerId] = React.useState('');
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState<string>('LAWYER');
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    if (!open) return;
    setName(user?.name ?? ''); setEmail(user?.email ?? ''); setRole(user?.role && (ASSIGNABLE_ROLES as readonly string[]).includes(user.role) ? user.role : 'LAWYER'); setLawyerId('');
    if (!isEdit) fetch('/api/lawyers', { cache: 'no-store' }).then((r) => r.ok ? r.json() : null).then((d) => setLawyers((d?.lawyers ?? []) as LawyerOption[])).catch(() => setLawyers([]));
  }, [open, user, isEdit]);
  const selectLawyer = (id: string) => { setLawyerId(id); const lawyer = lawyers.find((l) => l.id === id); if (!lawyer) return; setName(lawyer.fullName); setEmail((lawyer.googleEmail || lawyer.email || '').toLowerCase()); setRole('LAWYER'); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!name.trim() || !email.trim()) { toastError('اختر محامياً لديه بريد إلكتروني صالح.'); return; }
    setBusy(true);
    const body = { name: name.trim(), email: email.trim().toLowerCase(), role };
    const res = await fetch(isEdit ? `/api/users/${user!.id}` : '/api/users', { method: isEdit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setBusy(false); const d = await res.json().catch(() => ({}));
    if (res.ok) { toastSuccess(isEdit ? 'تم حفظ الحساب ✓' : 'تم إنشاء الحساب ✓'); onSaved(); } else toastError(d.error ?? 'تعذر الحفظ.');
  };
  return <Modal open={open} onClose={onClose} title={isEdit ? `تعديل حساب: ${user?.name}` : 'إضافة مستخدم جديد'} footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>إلغاء</Button><Button type="submit" form="user-form" disabled={busy}>{busy ? 'جارٍ الحفظ…' : <><Plus size={14} />{isEdit ? 'حفظ' : 'إضافة'}</>}</Button></div>}>
    <form id="user-form" onSubmit={submit} className="space-y-4">
      {!isEdit && <Field label="المحامي" required hint="اختر المحامي فقط؛ الاسم والبريد والدور يتم ملؤها تلقائياً."><Select value={lawyerId} onChange={(e) => selectLawyer(e.target.value)}><option value="">اختر محامياً…</option>{lawyers.map((lawyer) => <option key={lawyer.id} value={lawyer.id}>{lawyer.fullName}{!lawyer.googleEmail && !lawyer.email ? ' — بدون بريد' : ''}</option>)}</Select></Field>}
      {isEdit && <><Field label="الاسم" required><Input value={name} onChange={(e) => setName(e.target.value)} /></Field><Field label="البريد الإلكتروني" required><Input type="email" dir="ltr" className="ltr text-start" value={email} onChange={(e) => setEmail(e.target.value)} /></Field><Field label="الدور" required><Select value={role} onChange={(e) => setRole(e.target.value)}>{ASSIGNABLE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r] ?? r}</option>)}</Select></Field><p className="rounded-lg bg-ivory-100 px-3 py-2 text-[11px] font-bold leading-5 text-navy-400">{ROLE_DESCRIPTION[role]}</p></>}
      {!isEdit && <p className="rounded-xl bg-ivory-100 px-4 py-3 text-[11.5px] font-bold leading-6 text-navy-500">بعد الاختيار سيتم إنشاء المستخدم تلقائياً بدون كلمة مرور يدوية.</p>}
    </form>
  </Modal>;
}
