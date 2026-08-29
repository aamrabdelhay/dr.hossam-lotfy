'use client';

import * as React from 'react';
import { BellPlus, Loader2 } from 'lucide-react';
import { Button, Field, Input, Modal, Textarea } from './ui';
import { toastError, toastSuccess } from './toasts';

export function PersonalReminderCreator() {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [note, setNote] = React.useState('');
  const [remindAt, setRemindAt] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const reset = () => { setTitle(''); setNote(''); setRemindAt(''); };
  const submit = async () => {
    if (!title.trim() || !remindAt) { toastError('العنوان وموعد التذكير مطلوبان.'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/reminders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title.trim(), note: note.trim() || undefined, remindAt: new Date(remindAt).toISOString() }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toastError(data.error ?? 'تعذر إنشاء التذكير.'); return; }
      toastSuccess('تم حفظ التذكير الشخصي. سيظهر في إشعاراتك عند موعده.'); setOpen(false); reset();
    } catch { toastError('تعذر الاتصال بالخادم.'); } finally { setBusy(false); }
  };

  return <>
    <Button size="sm" variant="outline" onClick={() => setOpen(true)}><BellPlus size={14} /> تذكير شخصي</Button>
    <Modal open={open} onClose={() => !busy && setOpen(false)} title="تذكير شخصي" footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>إلغاء</Button><Button onClick={() => void submit()} disabled={busy}>{busy && <Loader2 size={14} className="animate-spin" />}حفظ التذكير</Button></div>}>
      <div className="space-y-4">
        <p className="text-[12px] font-semibold leading-6 text-navy-400">التذكير خاص بصاحبه. المحامي يرى تذكيراته فقط، والإدارة ترى تذكيرات المكتب كلها.</p>
        <Field label="عنوان التذكير" required status={!!title.trim()}><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: الاتصال بالعميل" autoFocus /></Field>
        <Field label="موعد التذكير" required status={!!remindAt}><Input type="datetime-local" value={remindAt} onChange={(e) => setRemindAt(e.target.value)} /></Field>
        <Field label="ملاحظة" status={!!note.trim()}><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة خاصة بالتذكير" /></Field>
      </div>
    </Modal>
  </>;
}
