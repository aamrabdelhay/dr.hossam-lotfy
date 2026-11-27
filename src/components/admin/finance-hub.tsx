'use client';
import * as React from 'react';
import { Check, X, UserPlus, UserMinus, WalletCards, Receipt, Banknote, Plus, ChevronDown } from 'lucide-react';

const money = (n: unknown) => `${Number(n || 0).toLocaleString('ar-EG')} جنيه`;
const STATUS: Record<string, string> = { PENDING: 'معلّق', APPROVED: 'تمت الموافقة', REJECTED: 'مرفوض', PAID: 'مدفوع' };

function Section({ icon: Icon, title, total, sub, children }: { icon: any; title: string; total: string; sub?: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-2xl border border-navy-100 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-500/10 text-gold-700"><Icon size={20} /></span>
        <span className="min-w-0 flex-1"><b className="block text-sm text-navy-950">{title}</b>{sub && <span className="text-[11px] font-bold text-navy-400">{sub}</span>}</span>
        <span className="text-sm font-extrabold text-gold-700">{total}</span>
        <ChevronDown size={16} className="shrink-0 text-navy-400 transition group-open:rotate-180" />
      </summary>
      <div className="space-y-3 border-t border-navy-100 p-4">{children}</div>
    </details>
  );
}

export function FinanceHub({ canManage = false, canAssignMembers = false }: { canManage?: boolean; canAssignMembers?: boolean }) {
  const [data, setData] = React.useState<any>(null);
  const [busy, setBusy] = React.useState(false);
  const [branchId, setBranchId] = React.useState('');
  const [lawyerId, setLawyerId] = React.useState('');
  const [form, setForm] = React.useState<'' | 'due' | 'expense'>('');
  const [f, setF] = React.useState({ lawyer: '', desc: '', cat: '', amount: '' });

  const load = React.useCallback(async (b?: string) => {
    setBusy(true);
    try {
      const r = await fetch('/api/admin/office' + (b ? `?branchId=${encodeURIComponent(b)}` : ''), { cache: 'no-store' });
      const j = await r.json();
      if (r.ok) { setData(j); setBranchId(j.selectedBranchId || ''); } else alert(j.error || 'تعذر تحميل الإدارة المالية');
    } finally { setBusy(false); }
  }, []);
  React.useEffect(() => { void load(); }, [load]);

  const post = async (body: any, url = '/api/admin/office') => {
    setBusy(true);
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'فشلت العملية');
      await load(branchId || undefined);
      return true;
    } catch (e) { alert(e instanceof Error ? e.message : 'فشلت العملية'); return false; } finally { setBusy(false); }
  };

  if (!data) return <div className="rounded-2xl border border-navy-100 bg-white p-5 text-sm">جاري تحميل الإدارة المالية…</div>;
  const requests = (data.requests || []).filter((x: any) => x.type === 'FINANCE');
  const pending = requests.filter((x: any) => x.status === 'PENDING');
  const dues = data.dues || [];
  const openDues = dues.filter((d: any) => d.status !== 'PAID');
  const expenses = data.expenses || [];
  const unpaidExp = expenses.filter((x: any) => x.status !== 'PAID');
  const sum = (a: any[], k: string) => a.reduce((s, x) => s + Number(x[k] || 0), 0);
  const reqAmount = (x: any) => (x.payload_json?.amount !== undefined ? money(x.payload_json.amount) : '');
  const inp = 'w-full rounded-xl border border-navy-200 p-3 text-base';

  return (
    <section className="space-y-3" dir="rtl">
      <div className="flex items-center gap-2"><WalletCards size={20} className="text-gold-600" /><h2 className="text-lg font-extrabold text-navy-950">الإدارة المالية</h2></div>
      {(data.branches || []).length > 1 && (
        <select value={branchId} onChange={(e) => void load(e.target.value)} className={inp} aria-label="الفرع">
          {canAssignMembers && <option value="">كل الفروع</option>}
          {data.branches.map((b: any) => <option key={b.id} value={b.id}>{b.name_ar}</option>)}
        </select>
      )}

      <Section icon={Banknote} title="طلبات الصرف" total={`${pending.length} معلّق`} sub={`${requests.length} طلب إجمالًا`}>
        {!requests.length ? <p className="py-4 text-center text-sm text-navy-400">لا توجد طلبات مالية.</p> : requests.map((x: any) => (
          <div key={x.id} className="rounded-xl border border-navy-100 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><b className="text-sm">{x.title}</b>
                <div className="mt-1 text-[11px] text-navy-400">{x.requester_lawyer_name || x.requester_user_name || 'حساب'} · {new Date(x.created_at).toLocaleDateString('ar-EG')} · {STATUS[x.status] || x.status}</div>
                {x.reason && <p className="mt-2 text-xs leading-6 text-navy-600">{x.reason}</p>}
                {reqAmount(x) && <p className="mt-1 text-sm font-extrabold text-gold-700">{reqAmount(x)}</p>}
              </div>
              {x.status === 'PENDING' && canManage && (
                <div className="flex shrink-0 gap-2">
                  <button disabled={busy} aria-label="موافقة" onClick={() => void post({ id: x.id, decision: 'APPROVED' }, '/api/admin/office/decision')} className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white"><Check size={16} /></button>
                  <button disabled={busy} aria-label="رفض" onClick={() => void post({ id: x.id, decision: 'REJECTED' }, '/api/admin/office/decision')} className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-white"><X size={16} /></button>
                </div>
              )}
            </div>
          </div>
        ))}
      </Section>

      <Section icon={Receipt} title="المستحقات" total={money(sum(openDues, 'amount'))} sub={`${openDues.length} غير مسدد`}>
        {canManage && <button type="button" onClick={() => setForm(form === 'due' ? '' : 'due')} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-navy-950 text-xs font-bold text-white"><Plus size={14} />إضافة مستحق</button>}
        {form === 'due' && (
          <div className="space-y-2 rounded-xl bg-ivory-50 p-3">
            <select value={f.lawyer} onChange={(e) => setF({ ...f, lawyer: e.target.value })} className={inp}><option value="">الزميل</option>{(data.lawyers || []).filter((l: any) => l.active !== false).map((l: any) => <option key={l.id} value={l.id}>{l.fullName}</option>)}</select>
            <input value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} placeholder="سبب / وصف الاستحقاق" className={inp} />
            <input value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} type="number" min="0" placeholder="المبلغ" className={inp} />
            <button disabled={busy || !f.desc || !(Number(f.amount) >= 0) || f.amount === ''} onClick={async () => { if (await post({ action: 'due_add', lawyerId: f.lawyer || undefined, branchId: branchId || undefined, description: f.desc, amount: Number(f.amount) })) { setF({ ...f, desc: '', amount: '' }); setForm(''); } }} className="h-11 w-full rounded-xl bg-gold-500 text-sm font-bold text-navy-950">حفظ</button>
          </div>
        )}
        {!dues.length ? <p className="py-4 text-center text-sm text-navy-400">لا توجد مستحقات.</p> : dues.map((d: any) => (
          <div key={d.id} className="flex items-center justify-between gap-3 rounded-xl border border-navy-100 p-3 text-xs">
            <div className="min-w-0"><b>{d.description}</b><div className="text-[11px] text-navy-400">{d.lawyer_name || '—'} · {new Date(d.created_at).toLocaleDateString('ar-EG')}</div></div>
            <div className="shrink-0 text-end"><b className="text-gold-700">{money(d.amount)}</b><div className="text-[10px] text-navy-400">{STATUS[d.status] || d.status}</div></div>
          </div>
        ))}
      </Section>

      <Section icon={WalletCards} title="مصاريف المكتب" total={money(sum(unpaidExp, 'amount'))} sub={`${unpaidExp.length} معلّق من ${expenses.length}`}>
        {canManage && <button type="button" onClick={() => setForm(form === 'expense' ? '' : 'expense')} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-navy-950 text-xs font-bold text-white"><Plus size={14} />إضافة مصروف</button>}
        {form === 'expense' && (
          <div className="space-y-2 rounded-xl bg-ivory-50 p-3">
            <input value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} placeholder="وصف المصروف" className={inp} />
            <input value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })} placeholder="التصنيف" className={inp} />
            <input value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} type="number" min="0" step="0.01" placeholder="المبلغ" className={inp} />
            <button disabled={busy || f.desc.trim().length < 2 || f.amount === ''} onClick={async () => { if (await post({ action: 'expense_add', description: f.desc.trim(), category: f.cat, amount: Number(f.amount), branchId: branchId || undefined })) { setF({ ...f, desc: '', cat: '', amount: '' }); setForm(''); } }} className="h-11 w-full rounded-xl bg-gold-500 text-sm font-bold text-navy-950">حفظ</button>
          </div>
        )}
        {!expenses.length ? <p className="py-4 text-center text-sm text-navy-400">لا توجد مصاريف.</p> : expenses.map((x: any) => (
          <div key={x.id} className="rounded-xl border border-navy-100 p-3 text-xs">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><b>{x.description}</b><div className="text-[11px] text-navy-400">{x.category || 'عام'} · {new Date(x.created_at).toLocaleDateString('ar-EG')} · {x.status === 'PAID' ? 'مدفوع' : 'معلّق'}</div></div><b className="shrink-0 text-gold-700">{money(x.amount)}</b></div>
            {canManage && <div className="mt-2 flex gap-2">{x.status !== 'PAID' && <button disabled={busy} onClick={() => void post({ action: 'expense_mark_paid', id: x.id })} className="h-10 flex-1 rounded-lg border font-bold text-emerald-700">تم الدفع</button>}<button disabled={busy} onClick={() => { if (confirm('حذف المصروف؟ (يُحفظ في الأرشيف)')) void post({ action: 'expense_delete', id: x.id }); }} className="h-10 flex-1 rounded-lg border font-bold text-red-600">حذف</button></div>}
          </div>
        ))}
      </Section>

      {canAssignMembers && (
        <Section icon={UserPlus} title="تعيين محامين في الإدارة المالية" total={`${(data.financeMembers || []).length}`} sub="الأعضاء يستطيعون الموافقة على الصرف وإدارة المستحقات والمصاريف">
          <p className="text-xs leading-6 text-navy-500">{branchId ? `التعيين لفرع: ${data.branches.find((b: any) => b.id === branchId)?.name_ar || ''}` : 'اختر فرعًا محددًا من القائمة بالأعلى أولًا.'}</p>
          <div className="flex gap-2">
            <select value={lawyerId} onChange={(e) => setLawyerId(e.target.value)} className={inp}><option value="">اختر زميلًا</option>{(data.availableLawyers || data.lawyers || []).filter((l: any) => l.active !== false).map((l: any) => <option key={l.id} value={l.id}>{l.fullName}</option>)}</select>
            <button disabled={!lawyerId || !branchId || busy} aria-label="تعيين" onClick={async () => { if (confirm('تعيين هذا الزميل في الإدارة المالية؟ سيستطيع الموافقة على طلبات الصرف.')) { if (await post({ action: 'finance_admin_add', lawyerId, branchId })) setLawyerId(''); } }} className="h-12 shrink-0 rounded-xl bg-navy-950 px-4 text-white"><UserPlus size={16} /></button>
          </div>
          {(data.financeMembers || []).map((m: any) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg bg-ivory-50 px-3 py-2 text-xs"><span className="font-bold">{m.lawyer_name}{m.branch_id ? ` · ${data.branches.find((b: any) => b.id === m.branch_id)?.name_ar || ''}` : ''}</span><button aria-label="إزالة" disabled={busy} onClick={() => { if (confirm('إزالة من الإدارة المالية؟')) void post({ action: 'finance_admin_remove', id: m.id }); }} className="flex h-10 w-10 items-center justify-center text-red-600"><UserMinus size={15} /></button></div>
          ))}
        </Section>
      )}
    </section>
  );
}
