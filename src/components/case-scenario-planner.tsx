'use client';

import * as React from 'react';
import { CalendarDays, CheckCircle2, ChevronDown, CircleDot, ClipboardList, Loader2, Plus, Save, ShieldAlert, Archive, Pencil, X } from 'lucide-react';

type Scenario = {
  id: string;
  title: string;
  triggerCondition: string;
  possibleOutcome: string;
  responsePlan: string;
  riskNotes: string;
  nextSteps: string[];
  targetDate: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'SELECTED' | 'ARCHIVED';
  createdByName?: string | null;
};

type FormState = {
  title: string;
  triggerCondition: string;
  possibleOutcome: string;
  responsePlan: string;
  riskNotes: string;
  nextStepsText: string;
  targetDate: string;
};

const EMPTY: FormState = {
  title: '',
  triggerCondition: '',
  possibleOutcome: '',
  responsePlan: '',
  riskNotes: '',
  nextStepsText: '',
  targetDate: '',
};

const STATUS: Record<Scenario['status'], { label: string; className: string }> = {
  DRAFT: { label: 'مسودة', className: 'bg-slate-100 text-slate-700' },
  ACTIVE: { label: 'قيد الدراسة', className: 'bg-blue-50 text-blue-700' },
  SELECTED: { label: 'خطة العمل المختارة', className: 'bg-emerald-50 text-emerald-700' },
  ARCHIVED: { label: 'مؤرشف', className: 'bg-navy-100 text-navy-500' },
};

export function CaseScenarioPlanner({ caseId, canEdit }: { caseId: string; canEdit: boolean }) {
  const [scenarios, setScenarios] = React.useState<Scenario[]>([]);
  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');

  const endpoint = '/api/cases/' + encodeURIComponent(caseId) + '/scenarios';
  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'تعذر تحميل سيناريوهات القضية');
      setScenarios(Array.isArray(data.scenarios) ? data.scenarios : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تحميل سيناريوهات القضية');
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  React.useEffect(() => { void load(); }, [load]);

  function startEdit(scenario: Scenario) {
    setEditingId(scenario.id);
    setForm({
      title: scenario.title,
      triggerCondition: scenario.triggerCondition || '',
      possibleOutcome: scenario.possibleOutcome,
      responsePlan: scenario.responsePlan || '',
      riskNotes: scenario.riskNotes || '',
      nextStepsText: (scenario.nextSteps || []).join('\n'),
      targetDate: scenario.targetDate || '',
    });
    setShowForm(true);
    setError('');
    setNotice('');
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY);
    setShowForm(false);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    const nextSteps = form.nextStepsText.split('\n').map((step) => step.trim()).filter(Boolean).slice(0, 20);
    const payload = {
      title: form.title.trim(),
      triggerCondition: form.triggerCondition.trim(),
      possibleOutcome: form.possibleOutcome.trim(),
      responsePlan: form.responsePlan.trim(),
      riskNotes: form.riskNotes.trim(),
      nextSteps,
      targetDate: form.targetDate || null,
    };
    try {
      const response = await fetch(editingId ? endpoint + '/' + encodeURIComponent(editingId) : endpoint, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'تعذر حفظ السيناريو');
      resetForm();
      setNotice(editingId ? 'تم تحديث السيناريو.' : 'تم إنشاء السيناريو.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر حفظ السيناريو');
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(scenario: Scenario, status: Scenario['status']) {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(endpoint + '/' + encodeURIComponent(scenario.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'تعذر تغيير حالة السيناريو');
      setNotice(status === 'SELECTED' ? 'تم اختيار السيناريو كخطة العمل الحالية.' : status === 'ARCHIVED' ? 'تمت أرشفة السيناريو.' : 'تم تحديث حالة السيناريو.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تغيير الحالة');
    } finally {
      setBusy(false);
    }
  }

  function field(name: keyof FormState, label: string, rows = 2, required = false, placeholder = '') {
    return <label className="block text-xs font-extrabold text-navy-700">
      {label}{required ? <span className="text-red-600"> *</span> : null}
      {rows === 1
        ? <input value={form[name]} onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))} maxLength={name === 'title' ? 180 : 1500} required={required} placeholder={placeholder} className="mt-1.5 h-10 w-full rounded-xl border border-navy-200 bg-white px-3 text-xs font-semibold outline-none focus:border-gold-500" />
        : <textarea value={form[name]} onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))} maxLength={name === 'possibleOutcome' ? 3000 : name === 'responsePlan' ? 4000 : name === 'riskNotes' ? 3000 : 1500} required={required} rows={rows} placeholder={placeholder} className="mt-1.5 w-full rounded-xl border border-navy-200 bg-white px-3 py-2.5 text-xs font-semibold leading-6 outline-none focus:border-gold-500" />}
    </label>;
  }

  return <section className="my-5 overflow-hidden rounded-2xl border border-navy-200 bg-white shadow-sm" dir="rtl">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-100 px-5 py-4">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-500/10 text-gold-700"><ClipboardList size={18} /></span>
        <div>
          <h2 className="text-sm font-black text-navy-950">سيناريوهات القضية وخطط التعامل</h2>
          <p className="mt-1 text-[10px] font-semibold text-navy-400">خطط بديلة مبنية على فرضيات يحددها فريق القضية</p>
        </div>
      </div>
      {canEdit && <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY); setShowForm((value) => !value); }} className="inline-flex items-center gap-1.5 rounded-xl bg-navy-950 px-3 py-2 text-[11px] font-extrabold text-white">
        {showForm && !editingId ? <X size={14} /> : <Plus size={14} />} {showForm && !editingId ? 'إغلاق النموذج' : 'إضافة سيناريو'}
      </button>}
    </header>

    <div className="border-b border-amber-100 bg-amber-50/70 px-5 py-3 text-[11px] font-semibold leading-6 text-amber-900">
      <span className="inline-flex items-center gap-1 font-black"><ShieldAlert size={14} /> تنبيه مهني</span>
      <p>هذه مساحة لتخطيط البدائل والإجراءات وفق الفرضيات التي يدخلها المحامي، وليست أداة للتنبؤ بما ستقضي به المحكمة أو بديلًا عن التقييم القانوني للمحامي المسؤول.</p>
    </div>

    {showForm && canEdit && <form onSubmit={save} className="space-y-3 border-b border-navy-100 bg-ivory-50/60 p-5">
      <h3 className="text-xs font-black text-navy-900">{editingId ? 'تعديل السيناريو' : 'سيناريو جديد'}</h3>
      {field('title', 'عنوان السيناريو', 1, true, 'مثال: صدور حكم بإجابة الطلبات')}
      {field('triggerCondition', 'الفرضية أو الشرط الذي ندرسه', 2, false, 'ما الواقعة أو القرار الذي يبدأ هذا السيناريو؟')}
      {field('possibleOutcome', 'النتيجة المحتملة وفق الفرضية', 3, true, 'اكتب الاحتمال محل الدراسة دون الجزم بوقوعه')}
      {field('responsePlan', 'خطة التعامل والإجراءات المقترحة', 3, false, 'ما الخيارات والإجراءات التي يجب تجهيزها؟')}
      {field('riskNotes', 'المخاطر والنقاط التي تحتاج تحققًا', 2, false, 'المواعيد أو المستندات أو المسائل التي تحتاج مراجعة')}
      {field('nextStepsText', 'الخطوات التالية (كل خطوة في سطر)', 4, false, 'مراجعة المستندات\nإعداد المسودة\nاعتماد الموعد')}
      <label className="block text-xs font-extrabold text-navy-700">التاريخ المستهدف (اختياري)
        <input type="date" value={form.targetDate} onChange={(event) => setForm((current) => ({ ...current, targetDate: event.target.value }))} className="mt-1.5 h-10 w-full rounded-xl border border-navy-200 bg-white px-3 text-xs font-semibold sm:max-w-xs" />
      </label>
      <p className="text-[10px] font-semibold text-navy-400">يمكن إضافة 20 خطوة كحد أقصى. لا تُنشأ مهام تلقائيًا من هذه القائمة.</p>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy || !form.title.trim() || !form.possibleOutcome.trim()} className="inline-flex items-center gap-2 rounded-xl bg-navy-950 px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {editingId ? 'حفظ التعديلات' : 'حفظ السيناريو'}
        </button>
        <button type="button" onClick={resetForm} disabled={busy} className="rounded-xl border border-navy-200 px-4 py-2.5 text-xs font-bold text-navy-600">إلغاء</button>
      </div>
    </form>}

    {error && <p role="alert" className="border-b border-red-100 bg-red-50 px-5 py-3 text-xs font-bold text-red-700">{error}</p>}
    {notice && <p role="status" className="border-b border-emerald-100 bg-emerald-50 px-5 py-3 text-xs font-bold text-emerald-700">{notice}</p>}

    {loading ? <p className="p-7 text-center text-xs font-semibold text-navy-400">جارٍ تحميل السيناريوهات...</p>
      : scenarios.length === 0 ? <div className="p-8 text-center text-sm font-semibold text-navy-400">لا توجد سيناريوهات مسجلة لهذه القضية حتى الآن.</div>
      : <div className="divide-y divide-navy-100">
        {scenarios.map((scenario) => <article key={scenario.id} className="space-y-3 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-black text-navy-950">{scenario.title}</h3>
                <span className={'rounded-full px-2.5 py-1 text-[10px] font-extrabold ' + STATUS[scenario.status].className}>{STATUS[scenario.status].label}</span>
              </div>
              {scenario.createdByName && <p className="mt-1 text-[10px] font-semibold text-navy-400">أعده: {scenario.createdByName}</p>}
            </div>
            {canEdit && scenario.status !== 'ARCHIVED' && <div className="flex flex-wrap gap-1.5">
              <button type="button" disabled={busy} onClick={() => startEdit(scenario)} className="inline-flex items-center gap-1 rounded-lg border border-navy-200 px-2.5 py-1.5 text-[10px] font-bold text-navy-600"><Pencil size={12} /> تعديل</button>
              {scenario.status !== 'SELECTED' && <button type="button" disabled={busy} onClick={() => void changeStatus(scenario, 'SELECTED')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1.5 text-[10px] font-bold text-white"><CheckCircle2 size={12} /> اختيار الخطة</button>}
              {scenario.status === 'SELECTED' && <button type="button" disabled={busy} onClick={() => void changeStatus(scenario, 'ACTIVE')} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700"><CircleDot size={12} /> إلغاء الاختيار</button>}
              <button type="button" disabled={busy} onClick={() => void changeStatus(scenario, 'ARCHIVED')} className="inline-flex items-center gap-1 rounded-lg border border-navy-200 px-2.5 py-1.5 text-[10px] font-bold text-navy-500"><Archive size={12} /> أرشفة</button>
            </div>}
          </div>
          {scenario.triggerCondition && <div><p className="text-[10px] font-black text-navy-500">الفرضية</p><p className="mt-1 whitespace-pre-wrap text-xs leading-6 text-navy-700">{scenario.triggerCondition}</p></div>}
          <div><p className="text-[10px] font-black text-navy-500">النتيجة المحتملة</p><p className="mt-1 whitespace-pre-wrap text-xs leading-6 text-navy-800">{scenario.possibleOutcome}</p></div>
          {scenario.responsePlan && <div><p className="text-[10px] font-black text-navy-500">خطة التعامل</p><p className="mt-1 whitespace-pre-wrap text-xs leading-6 text-navy-700">{scenario.responsePlan}</p></div>}
          {scenario.riskNotes && <div><p className="text-[10px] font-black text-navy-500">المخاطر والنقاط المطلوب التحقق منها</p><p className="mt-1 whitespace-pre-wrap text-xs leading-6 text-navy-700">{scenario.riskNotes}</p></div>}
          {scenario.nextSteps?.length > 0 && <div><p className="inline-flex items-center gap-1 text-[10px] font-black text-navy-500"><ChevronDown size={12} /> الخطوات التالية</p><ol className="mt-1 list-inside list-decimal space-y-1 text-xs leading-6 text-navy-700">{scenario.nextSteps.map((step, index) => <li key={scenario.id + '-' + index}>{step}</li>)}</ol></div>}
          {scenario.targetDate && <p className="inline-flex items-center gap-1 text-[10px] font-semibold text-navy-400"><CalendarDays size={12} /> التاريخ المستهدف: {scenario.targetDate}</p>}
          {scenario.status === 'ARCHIVED' && <p className="text-[10px] font-semibold text-navy-400">هذا السيناريو مؤرشف ولا يمكن تعديله من هذه الشاشة.</p>}
        </article>)}
      </div>}
  </section>;
}
