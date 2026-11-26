'use client';
import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

type Field = { key: string; label: string; type: 'text' | 'longtext' | 'number' | 'date' | 'select' | 'checkbox'; required: boolean; options?: string[]; showIf?: { field: string; equals: string | boolean } };
type FormRow = { id: string; title: string; definition: { fields: Field[] } };
const TYPES: Record<Field['type'], string> = { text: 'نص قصير', longtext: 'نص طويل', number: 'رقم', date: 'تاريخ', select: 'اختيار', checkbox: 'مربع اختيار' };
const input = 'w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm';

export function FormsAdmin() {
  const [forms, setForms] = useState<FormRow[]>([]);
  const [title, setTitle] = useState('');
  const [fields, setFields] = useState<Field[]>([]);
  const [msg, setMsg] = useState('');
  const [fill, setFill] = useState<FormRow | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  async function load() { const r = await fetch('/api/admin/forms'); if (r.ok) setForms((await r.json()).forms); }
  useEffect(() => { load(); }, []);
  const upd = (i: number, p: Partial<Field>) => setFields((f) => f.map((x, j) => (j === i ? { ...x, ...p } : x)));
  async function save() {
    setMsg('');
    const r = await fetch('/api/admin/forms', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title, definition: { fields } }) });
    const b = await r.json().catch(() => ({}));
    if (r.ok) { setMsg('تم حفظ النموذج'); setTitle(''); setFields([]); load(); } else setMsg(r.status === 403 ? 'ليس لديك صلاحية إنشاء نماذج' : 'تعذر الحفظ: ' + (b.detail?.join('، ') || 'راجع الحقول'));
  }
  const visible = (f: Field) => !f.showIf || answers[f.showIf.field] === f.showIf.equals;
  async function submit() {
    if (!fill) return; setMsg('');
    const r = await fetch(`/api/forms/${fill.id}/submit`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ answers }) });
    const b = await r.json().catch(() => ({}));
    if (r.ok) { setMsg('تم إرسال الإجابات'); setFill(null); setAnswers({}); } else setMsg(b.fields ? 'حقول ناقصة أو غير صحيحة: ' + Object.keys(b.fields).join('، ') : 'تعذر الإرسال');
  }
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-extrabold text-navy-950">منشئ النماذج الداخلية</h1>
      {msg && <p role="status" className="rounded-lg bg-navy-50 p-3 text-sm font-bold text-navy-800">{msg}</p>}
      <section className="rounded-2xl border border-navy-100 bg-white p-4">
        <h2 className="mb-3 text-sm font-extrabold">نموذج جديد</h2>
        <input className={input} placeholder="عنوان النموذج" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="mt-3 space-y-3">
          {fields.map((f, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-navy-100 p-3 sm:grid-cols-6">
              <input className={input + ' sm:col-span-2'} placeholder="اسم الحقل" value={f.label} onChange={(e) => upd(i, { label: e.target.value })} />
              <input className={input} dir="ltr" placeholder="key" value={f.key} onChange={(e) => upd(i, { key: e.target.value })} />
              <select className={input} value={f.type} onChange={(e) => upd(i, { type: e.target.value as Field['type'] })}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={f.required} onChange={(e) => upd(i, { required: e.target.checked })} />مطلوب</label>
              <button type="button" aria-label="حذف الحقل" onClick={() => setFields((x) => x.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
              {f.type === 'select' && <input className={input + ' sm:col-span-6'} placeholder="الخيارات مفصولة بفاصلة" value={(f.options ?? []).join(',')} onChange={(e) => upd(i, { options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />}
              {i > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold sm:col-span-6">
                  <span>يظهر فقط إذا</span>
                  <select className={input + ' !w-auto'} value={f.showIf?.field ?? ''} onChange={(e) => upd(i, { showIf: e.target.value ? { field: e.target.value, equals: f.showIf?.equals ?? '' } : undefined })}>
                    <option value="">دائماً</option>{fields.slice(0, i).map((p) => <option key={p.key} value={p.key}>{p.label || p.key}</option>)}
                  </select>
                  {f.showIf && <><span>يساوي</span><input className={input + ' !w-auto'} value={String(f.showIf.equals)} onChange={(e) => upd(i, { showIf: { field: f.showIf!.field, equals: e.target.value === 'true' ? true : e.target.value === 'false' ? false : e.target.value } })} /></>}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => setFields((f) => [...f, { key: 'field' + (f.length + 1), label: '', type: 'text', required: false }])} className="inline-flex items-center gap-1 rounded-lg border border-navy-200 px-3 py-2 text-xs font-extrabold"><Plus size={14} />إضافة حقل</button>
          <button type="button" disabled={!title || !fields.length} onClick={save} className="rounded-lg bg-navy-950 px-3 py-2 text-xs font-extrabold text-white disabled:opacity-40">حفظ النموذج</button>
        </div>
      </section>
      <section className="rounded-2xl border border-navy-100 bg-white p-4">
        <h2 className="mb-3 text-sm font-extrabold">النماذج الحالية</h2>
        {forms.length === 0 ? <p className="text-xs font-semibold text-navy-400">لا توجد نماذج بعد.</p> : <ul className="space-y-2">{forms.map((f) => <li key={f.id} className="flex items-center justify-between text-sm font-bold"><span>{f.title}</span><button type="button" onClick={() => { setFill(f); setAnswers({}); setMsg(''); }} className="rounded-lg border border-navy-200 px-3 py-1 text-xs">تعبئة</button></li>)}</ul>}
      </section>
      {fill && (
        <section className="rounded-2xl border border-gold-500/40 bg-white p-4" aria-label="تعبئة النموذج">
          <h2 className="mb-3 text-sm font-extrabold">{fill.title}</h2>
          <div className="space-y-3">
            {fill.definition.fields.filter(visible).map((f) => (
              <label key={f.key} className="block text-xs font-bold">{f.label}{f.required && ' *'}
                {f.type === 'select' ? <select className={input} value={String(answers[f.key] ?? '')} onChange={(e) => setAnswers({ ...answers, [f.key]: e.target.value })}><option value="" />{f.options?.map((o) => <option key={o}>{o}</option>)}</select>
                  : f.type === 'checkbox' ? <input type="checkbox" className="ms-2" checked={answers[f.key] === true} onChange={(e) => setAnswers({ ...answers, [f.key]: e.target.checked })} />
                  : f.type === 'longtext' ? <textarea className={input} value={String(answers[f.key] ?? '')} onChange={(e) => setAnswers({ ...answers, [f.key]: e.target.value })} />
                  : <input className={input} type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'} value={String(answers[f.key] ?? '')} onChange={(e) => setAnswers({ ...answers, [f.key]: e.target.value })} />}
              </label>
            ))}
          </div>
          <button type="button" onClick={submit} className="mt-3 rounded-lg bg-navy-950 px-3 py-2 text-xs font-extrabold text-white">إرسال</button>
        </section>
      )}
    </div>
  );
}
