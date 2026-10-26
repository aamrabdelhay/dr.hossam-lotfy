'use client';

import * as React from 'react';
import { Users, Save, Loader2 } from 'lucide-react';

type Client = { id: string; name: string; phone: string | null; email: string | null };

export function CaseClientsPanel({ caseId }: { caseId: string }) {
  const [clients, setClients] = React.useState<Client[]>([]);
  const [options, setOptions] = React.useState<Client[]>([]);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [canEdit, setCanEdit] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');

  const load = React.useCallback(async () => {
    try {
      const response = await fetch('/api/cases/' + encodeURIComponent(caseId) + '/clients', { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'تعذر تحميل العملاء المرتبطين بالقضية.');
      const linked = Array.isArray(data.clients) ? data.clients : [];
      setClients(linked);
      setSelected(linked.map((client: Client) => client.id));
      setOptions(Array.isArray(data.options) ? data.options : []);
      setCanEdit(Boolean(data.canEdit));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تحميل العملاء.');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  React.useEffect(() => { void load(); }, [load]);

  const save = async () => {
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/cases/' + encodeURIComponent(caseId) + '/clients', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientIds: selected }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'تعذر حفظ العملاء.');
      setClients(data.clients || []);
      setSelected((data.clients || []).map((client: Client) => client.id));
      setNotice('تم حفظ العملاء المرتبطين بالقضية.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر حفظ العملاء.');
    } finally { setSaving(false); }
  };

  return <section className="mt-5 rounded-2xl border border-navy-100 bg-white shadow-card overflow-hidden">
    <div className="border-b border-navy-100 px-5 py-4"><h2 className="flex items-center gap-2 text-sm font-black text-navy-950"><Users size={17} className="text-gold-600"/> العملاء المرتبطون بالقضية</h2><p className="mt-1 text-[10px] text-navy-400">يمكن ربط القضية بأكثر من عميل، ويظل كل عميل مرتبطًا بملفه المستقل.</p></div>
    {error && <p role="alert" className="px-5 py-3 text-xs text-red-700 bg-red-50">{error}</p>}
    {notice && <p role="status" className="px-5 py-3 text-xs text-emerald-700 bg-emerald-50">{notice}</p>}
    {loading ? <div className="p-6 text-xs text-navy-400">جارٍ تحميل العملاء…</div> : <div className="p-5">
      {clients.length ? <div className="mb-4 flex flex-wrap gap-2">{clients.map(client => <a key={client.id} href={'/admin/clients/'+client.id} className="rounded-xl border border-navy-100 bg-ivory-50 px-3 py-2 text-xs font-bold text-navy-800 hover:border-gold-400">{client.name}{client.phone ? ' · '+client.phone : ''}</a>)}</div> : <p className="mb-4 text-xs text-navy-400">لا يوجد عميل مرتبط بالقضية حاليًا.</p>}
      {canEdit && <div className="space-y-3"><p className="text-xs font-extrabold text-navy-700">حدد كل العملاء المرتبطين</p><div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">{options.map(client => <label key={client.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-navy-100 p-2 text-xs"><input type="checkbox" checked={selected.includes(client.id)} onChange={event => setSelected(current => event.target.checked ? [...current, client.id] : current.filter(id => id !== client.id))}/><span className="font-bold">{client.name}</span><span className="ms-auto text-[10px] text-navy-400">{client.phone || ''}</span></label>)}</div><button type="button" onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-navy-950 px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">{saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}حفظ العملاء</button></div>}
    </div>}
  </section>;
}
