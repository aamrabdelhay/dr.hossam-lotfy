'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Home,
  Loader2,
  Search,
  Send,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';

type Choice = { id: string; name: string; number?: string };
type Action = {
  type: string;
  description?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  lawyerIds?: string[];
  locationId?: string;
  notes?: string;
  caseName?: string;
  caseNumber?: string;
  clientName?: string;
  missing?: string[];
  choices?: { lawyers: Choice[]; locations: Choice[]; cases?: Choice[] };
};
type Nav = { path: string; label: string };
type Msg = {
  role: 'user' | 'assistant';
  text: string;
  action?: Action;
  nav?: Nav;
  success?: boolean;
};

const quick = [
  ['إضافة جلسة جديدة', 'عايز أحط جلسة جديدة'],
  ['إنشاء مهمة', 'اعمل مهمة جديدة'],
  ['مواعيد اليوم', 'إيه جلسات ومواعيد النهارده؟'],
  ['القضايا المفتوحة', 'اعرض القضايا المفتوحة'],
  ['شرح النظام', 'إزاي أستخدم النظام؟'],
] as const;

const taskPresets = [
  'مراجعة ملف',
  'إعداد مذكرة',
  'بحث قانوني',
  'تجهيز مستندات',
  'متابعة قضية',
  'حضور جلسة',
];

function SearchablePicker({
  label,
  placeholder,
  items,
  value,
  onChange,
  multi = false,
  emptyText = 'لا توجد نتائج',
}: {
  label: string;
  placeholder: string;
  items: Choice[];
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
  multi?: boolean;
  emptyText?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const ref = React.useRef<HTMLDivElement>(null);
  const values = multi ? (Array.isArray(value) ? value : []) : [];

  React.useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLocaleLowerCase('ar-EG');
    if (!q) return items;
    return items.filter((item) =>
      `${item.name} ${item.number ?? ''}`.toLocaleLowerCase('ar-EG').includes(q),
    );
  }, [items, query]);

  const selectedItems = multi
    ? items.filter((item) => values.includes(item.id))
    : items.filter((item) => item.id === value);

  const display = multi
    ? selectedItems.length
      ? selectedItems.map((item) => item.name).join('، ')
      : 'اختر من القائمة'
    : selectedItems[0]?.name || 'بدون تحديد';

  const toggle = (item: Choice) => {
    if (multi) {
      const next = values.includes(item.id)
        ? values.filter((id) => id !== item.id)
        : [...values, item.id];
      onChange(next);
      return;
    }
    onChange(item.id);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={ref} className="relative">
      <div className="mb-1 text-[11px] font-bold text-navy-700">{label}</div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-10 w-full items-center justify-between gap-2 rounded-xl border border-navy-200 bg-white px-3 py-2 text-start text-xs text-navy-800 transition hover:border-gold-400 focus:border-gold-500"
      >
        <span className={cn('min-w-0 flex-1 truncate', !selectedItems.length && 'text-navy-400')}>
          {display}
        </span>
        <ChevronDown size={15} className={cn('shrink-0 text-navy-400 transition', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-2xl border border-navy-200 bg-white shadow-xl">
          <div className="border-b border-navy-100 p-2">
            <div className="flex items-center gap-2 rounded-xl border border-navy-200 bg-ivory-50 px-3">
              <Search size={14} className="shrink-0 text-navy-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                className="h-9 min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-navy-400"
              />
              {query && (
                <button type="button" aria-label="مسح البحث" onClick={() => setQuery('')}>
                  <X size={13} className="text-navy-400" />
                </button>
              )}
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {!multi && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                  setQuery('');
                }}
                className={cn(
                  'mb-1 flex w-full items-center rounded-xl px-3 py-2 text-start text-xs transition hover:bg-ivory-50',
                  !selectedItems.length ? 'font-bold text-navy-950' : 'text-navy-500',
                )}
              >
                بدون تحديد
              </button>
            )}
            {filtered.length ? (
              filtered.map((item) => {
                const selected = multi ? values.includes(item.id) : value === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggle(item)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-start text-xs transition',
                      selected ? 'bg-gold-50 text-navy-950' : 'text-navy-700 hover:bg-ivory-50',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{item.name}</span>
                      {item.number && <span className="mt-0.5 block truncate text-[10px] text-navy-400">{item.number}</span>}
                    </span>
                    {selected && <Check size={15} className="shrink-0 text-gold-600" />}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-center text-[11px] text-navy-400">{emptyText}</div>
            )}
          </div>
          {multi && (
            <div className="flex items-center justify-between border-t border-navy-100 bg-ivory-50 px-3 py-2 text-[10px] text-navy-500">
              <span>{selectedItems.length ? `تم اختيار ${selectedItems.length}` : 'لم يتم اختيار أي محامٍ'}</span>
              <button type="button" onClick={() => setOpen(false)} className="font-extrabold text-navy-900">
                تم
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ActionForm({
  action,
  onDone,
  busy,
}: {
  action: Action;
  onDone: (a: Action) => void;
  busy: boolean;
}) {
  const [v, setV] = React.useState<Action>(action);
  React.useEffect(() => setV(action), [action]);

  const change = (key: keyof Action, value: unknown) => setV((state) => ({ ...state, [key]: value }));
  const lawyers = v.choices?.lawyers ?? [];
  const locations = v.choices?.locations ?? [];
  const cases = v.choices?.cases ?? [];
  const selectedCase = cases.find((item) => item.number === v.caseNumber || item.id === v.caseNumber);

  return (
    <div className="mt-3 space-y-3 rounded-2xl border border-gold-200 bg-gold-50/70 p-3">
      <div className="flex items-center gap-2 text-xs font-extrabold text-navy-950">
        <ClipboardList size={15} className="text-gold-600" />
        مراجعة بيانات التنفيذ
      </div>
      <p className="text-[10px] leading-5 text-navy-500">
        اختار كل قيمة بالضغط عليها. استخدم خانة البحث داخل أي قائمة للوصول بسرعة، واكتب في مربع الدردشة فقط عند الحاجة.
      </p>

      <div>
        <div className="mb-1 flex items-center gap-2 text-[11px] font-bold text-navy-700">
          <UserRound size={13} className="text-gold-600" />
          نوع المهمة
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {taskPresets.map((preset) => (
            <button
              type="button"
              key={preset}
              onClick={() => change('description', preset)}
              className={cn(
                'rounded-xl border px-3 py-2 text-[11px] font-bold transition',
                v.description === preset
                  ? 'border-gold-500 bg-gold-100 text-navy-950'
                  : 'border-navy-200 bg-white text-navy-700 hover:border-gold-400',
              )}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      <label className="block text-[11px] font-bold text-navy-700">
        وصف إضافي للمهمة
        <input
          value={v.description || ''}
          onChange={(e) => change('description', e.target.value)}
          placeholder="مثال: مراجعة مذكرة الدفاع وتجهيز المستندات"
          className="mt-1 h-10 w-full rounded-xl border border-navy-200 bg-white px-3 text-xs outline-none focus:border-gold-500"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <SearchablePicker
          label="المحامي / المحامون"
          placeholder="ابحث باسم المحامي..."
          items={lawyers}
          value={v.lawyerIds || []}
          multi
          onChange={(value) => change('lawyerIds', value)}
        />

        <SearchablePicker
          label="المحكمة / الجهة"
          placeholder="ابحث عن المحكمة أو الجهة..."
          items={locations}
          value={v.locationId || ''}
          onChange={(value) => change('locationId', value || undefined)}
        />

        {cases.length > 0 && (
          <SearchablePicker
            label="القضية"
            placeholder="ابحث باسم القضية أو رقمها..."
            items={cases}
            value={selectedCase?.id || ''}
            onChange={(value) => {
              const c = cases.find((item) => item.id === value);
              change('caseNumber', c?.number || undefined);
              change('caseName', c?.name || undefined);
            }}
          />
        )}

        <label className="block text-[11px] font-bold text-navy-700">
          التاريخ
          <input
            type="date"
            value={v.scheduledDate || ''}
            onChange={(e) => change('scheduledDate', e.target.value || undefined)}
            className="mt-1 h-10 w-full rounded-xl border border-navy-200 bg-white px-3 text-xs outline-none focus:border-gold-500"
          />
        </label>

        <label className="block text-[11px] font-bold text-navy-700">
          الوقت
          <input
            type="time"
            value={v.scheduledTime || ''}
            onChange={(e) => change('scheduledTime', e.target.value || undefined)}
            className="mt-1 h-10 w-full rounded-xl border border-navy-200 bg-white px-3 text-xs outline-none focus:border-gold-500"
          />
        </label>

        <label className="block text-[11px] font-bold text-navy-700">
          اسم العميل
          <input
            value={v.clientName || ''}
            onChange={(e) => change('clientName', e.target.value)}
            placeholder="اختياري"
            className="mt-1 h-10 w-full rounded-xl border border-navy-200 bg-white px-3 text-xs outline-none focus:border-gold-500"
          />
        </label>
      </div>

      <label className="block text-[11px] font-bold text-navy-700">
        ملاحظات
        <textarea
          value={v.notes || ''}
          onChange={(e) => change('notes', e.target.value)}
          placeholder="اختياري"
          className="mt-1 min-h-20 w-full rounded-xl border border-navy-200 bg-white px-3 py-2 text-xs outline-none focus:border-gold-500"
        />
      </label>

      <button
        type="button"
        disabled={busy}
        onClick={() => onDone({ ...v, missing: undefined, choices: undefined })}
        className="inline-flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-xs font-extrabold text-navy-950 disabled:opacity-60"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
        تأكيد وتنفيذ المهمة
      </button>
    </div>
  );
}

function cleanAssistantText(text: string) {
  return text
    .replace(/\*/g, '')
    .replace(/__/g, '')
    .replace(/^\s*[#_]+\s*/gm, '')
    .replace(/^\s*[-•]\s+/gm, '')
    .trim();
}

export function OfficeAssistant() {
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [configured, setConfigured] = React.useState<boolean | null>(null);
  const [loaded, setLoaded] = React.useState(false);

  const load = React.useCallback(async () => {
    if (loaded) return;
    try {
      const response = await fetch('/api/assistant', { cache: 'no-store' });
      const data = await response.json();
      setConfigured(Boolean(data.configured));
    } catch {
      // Keep the assistant usable even if the status probe fails.
    } finally {
      setLoaded(true);
    }
  }, [loaded]);

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const submit = async (text = input, action?: Action, finalize = false) => {
    if (!text.trim() || busy) return;
    setInput('');
    setMessages((current) => [...current, { role: 'user', text }]);
    setBusy(true);

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action ? { message: text, action, confirm: finalize } : { message: text }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream') && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let answer = '';
        let aiIndex = -1;

        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === 'token') {
                answer += event.text;
                setMessages((current) => {
                  const copy = [...current];
                  if (aiIndex < 0) {
                    aiIndex = copy.length;
                    copy.push({ role: 'assistant', text: event.text });
                  } else {
                    copy[aiIndex] = { ...copy[aiIndex], text: copy[aiIndex].text + event.text };
                  }
                  return copy;
                });
              } else if (event.type === 'done' && event.action) {
                setMessages((current) =>
                  current.map((item, index) => (index === aiIndex ? { ...item, action: event.action } : item)),
                );
              } else if (event.type === 'done' && event.success) {
                setMessages((current) => [
                  ...current,
                  { role: 'assistant', text: event.reply || 'تم التنفيذ بنجاح.', success: true, nav: event.navigation },
                ]);
              } else if (event.type === 'error') {
                setMessages((current) => [
                  ...current,
                  { role: 'assistant', text: event.error || 'تعذر تنفيذ الطلب.' },
                ]);
              }
            } catch {
              // Ignore malformed SSE lines and keep the stream alive.
            }
          }
        }

        if (!answer && aiIndex < 0) {
          setMessages((current) => [...current, { role: 'assistant', text: 'تم استلام الطلب.' }]);
        }
      } else {
        const data = await response.json();
        setMessages((current) => [
          ...current,
          {
            role: 'assistant',
            text: data.reply || data.error || 'تعذر تنفيذ الطلب.',
            action: data.action,
            success: data.success,
            nav: data.navigation,
          },
        ]);
      }
    } catch {
      setMessages((current) => [...current, { role: 'assistant', text: 'تعذر الاتصال بالمساعد حاليًا.' }]);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (action: Action) => {
    await submit('تأكيد وتنفيذ المهمة', action, true);
  };

  return (
    <>
      {!open && (
        <button
          aria-label="فتح المساعد الذكي"
          title="مساعد المكتب"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 end-5 z-[120] flex h-15 w-15 items-center justify-center rounded-full border-2 border-gold-400/70 bg-navy-950 text-gold-400 shadow-[0_16px_45px_rgba(5,8,15,.28)] ring-4 ring-gold-400/10 transition hover:scale-105"
        >
          <Bot size={26} />
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[130] flex items-end justify-end bg-navy-950/25 p-3 sm:p-6">
          <div dir="rtl" className="flex h-[min(800px,calc(100vh-24px))] w-full max-w-[680px] flex-col overflow-hidden rounded-[28px] border border-navy-200 bg-white shadow-2xl">
            <header className="flex items-center justify-between bg-navy-950 px-5 py-4 text-white">
              <div>
                <div className="flex items-center gap-2 font-extrabold">
                  <Sparkles size={17} className="text-gold-400" />
                  مساعد المكتب الذكي
                </div>
                <p className="mt-1 text-[10px] text-white/55">اكتب بطريقتك أو اختر من القوائم، والمساعد يتولى فهم الباقي.</p>
              </div>
              <div className="flex items-center gap-1">
                <Link
                  href="/"
                  aria-label="العودة إلى الصفحة الرئيسية"
                  title="الصفحة الرئيسية"
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-extrabold text-white hover:bg-white/10"
                >
                  <Home size={17} />
                  <span>الرئيسية</span>
                </Link>
                <button onClick={() => setOpen(false)} aria-label="إغلاق" className="rounded-xl p-2 hover:bg-white/10">
                  <X size={19} />
                </button>
              </div>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto bg-ivory-50 p-4">
              {configured === false && messages.length === 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900">
                  GEMINI_API_KEY غير مضبوط بعد؛ الردود الذكية لن تعمل حتى تضيفه في Vercel.
                </div>
              )}

              {messages.length === 0 && (
                <div>
                  <p className="mb-3 text-sm font-extrabold text-navy-900">الإجراءات السريعة</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {quick.map(([label, text]) => (
                      <button
                        key={label}
                        onClick={() => void submit(text)}
                        className="rounded-2xl border border-navy-100 bg-white p-4 text-start text-xs font-extrabold text-navy-800 shadow-sm hover:border-gold-400"
                      >
                        <span>{label}</span>
                        <span className="mt-1 block text-[10px] font-medium text-navy-400">{text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    'max-w-[95%] rounded-2xl px-4 py-3 text-sm leading-7',
                    message.role === 'user'
                      ? 'ms-auto bg-navy-950 text-white'
                      : 'me-auto border border-navy-100 bg-white text-navy-800 shadow-sm',
                  )}
                >
                  <div className="whitespace-pre-wrap">
                    {message.action
                      ? 'تمام. اختار البيانات المطلوبة من القوائم التالية ثم اضغط تأكيد وتنفيذ.'
                      : cleanAssistantText(message.text)}
                  </div>

                  {message.action && (
                    <ActionForm
                      action={message.action}
                      onDone={(action) =>
                        void (message.action?.missing?.length
                          ? submit('استكمال البيانات', action)
                          : confirm(action))
                      }
                      busy={busy}
                    />
                  )}

                  {message.nav && (
                    <a href={message.nav.path} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-navy-950 px-4 py-2.5 text-xs font-extrabold text-white">
                      {message.nav.label}
                      <ArrowLeft size={14} />
                    </a>
                  )}

                  {message.success && (
                    <div className="mt-2 flex items-center gap-2 text-xs font-extrabold text-emerald-700">
                      <CheckCircle2 size={16} />
                      تم التنفيذ بنجاح
                    </div>
                  )}
                </div>
              ))}

              {busy && (
                <div className="me-auto flex items-center gap-2 rounded-2xl border border-navy-100 bg-white px-4 py-3 text-xs text-navy-500 shadow-sm">
                  <Loader2 size={14} className="animate-spin" />
                  جاري معالجة الطلب…
                </div>
              )}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
              className="flex gap-2 border-t border-navy-100 bg-white p-3"
            >
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="اكتب طلبك بطريقتك، أو استخدم الاختيارات الظاهرة فوق"
                className="min-w-0 flex-1 rounded-xl border border-navy-200 px-4 py-3 text-sm outline-none focus:border-gold-500"
              />
              <button
                disabled={busy || !input.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-950 text-gold-400 disabled:opacity-40"
              >
                <Send size={17} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
