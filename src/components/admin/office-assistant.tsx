'use client';

import * as React from 'react';
import {
  ArrowLeft,
  Bot,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
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

type PickerProps = {
  label: string;
  placeholder: string;
  items: Choice[];
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
  multi?: boolean;
};

const quick = [
  ['إضافة جلسة جديدة', 'عايز أحط جلسة جديدة'],
  ['إنشاء مهمة', 'اعمل مهمة جديدة'],
  ['مواعيد اليوم', 'إيه جلسات ومواعيد النهارده؟'],
  ['القضايا المفتوحة', 'اعرض القضايا المفتوحة'],
  ['شرح النظام', 'إزاي أستخدم النظام؟'],
] as const;

const taskTypes = [
  'مراجعة ملف',
  'إعداد مذكرة',
  'بحث قانوني',
  'تجهيز مستندات',
  'متابعة قضية',
  'اتصال بعميل',
  'متابعة إجراء',
  'حضور جلسة',
] as const;

const sessionTypes = [
  'جلسة مرافعة',
  'جلسة تجديد',
  'جلسة حجز للحكم',
  'جلسة خبرة',
  'جلسة إعلان',
  'جلسة إدارية',
] as const;

const timeOptions = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

function cairoToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateLabel(iso: string) {
  const today = cairoToday();
  const tomorrow = addDays(today, 1);
  const afterTomorrow = addDays(today, 2);
  if (iso === today) return 'اليوم';
  if (iso === tomorrow) return 'غدًا';
  if (iso === afterTomorrow) return 'بعد غد';
  return new Intl.DateTimeFormat('ar-EG', {
    timeZone: 'Africa/Cairo',
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${iso}T12:00:00Z`));
}

function SearchablePicker({ label, placeholder, items, value, onChange, multi = false }: PickerProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const ref = React.useRef<HTMLDivElement>(null);
  const values = multi && Array.isArray(value) ? value : [];

  React.useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
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
    ? selectedItems.length > 0
      ? selectedItems.map((item) => item.name).join('، ')
      : 'اختر محاميًا'
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
        onClick={() => setOpen((state) => !state)}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-navy-200 bg-white px-3 text-start text-xs text-navy-800 transition hover:border-gold-400 focus:border-gold-500"
      >
        <span className={cn('min-w-0 flex-1 truncate', !selectedItems.length && 'text-navy-400')}>
          {display}
        </span>
        <ChevronDown size={15} className={cn('shrink-0 text-navy-400 transition', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-40 mt-1 overflow-hidden rounded-2xl border border-navy-200 bg-white shadow-2xl">
          <div className="border-b border-navy-100 p-2">
            <div className="flex items-center gap-2 rounded-xl border border-navy-200 bg-ivory-50 px-3">
              <Search size={14} className="shrink-0 text-navy-400" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={placeholder}
                className="h-10 min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-navy-400"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} aria-label="مسح البحث">
                  <X size={13} className="text-navy-400" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto p-1">
            {!multi && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                  setQuery('');
                }}
                className="flex w-full rounded-xl px-3 py-2.5 text-start text-xs font-bold text-navy-500 hover:bg-ivory-50"
              >
                بدون تحديد
              </button>
            )}
            {filtered.length === 0 ? (
              <div className="px-3 py-5 text-center text-[11px] text-navy-400">لا توجد نتائج مطابقة</div>
            ) : (
              filtered.map((item) => {
                const selected = multi ? values.includes(item.id) : item.id === value;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggle(item)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-start text-xs transition',
                      selected ? 'bg-gold-50 text-navy-950' : 'text-navy-700 hover:bg-ivory-50',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{item.name}</span>
                      {item.number && <span className="mt-0.5 block text-[10px] text-navy-400">{item.number}</span>}
                    </span>
                    {selected && <Check size={15} className="shrink-0 text-gold-600" />}
                  </button>
                );
              })
            )}
          </div>

          {multi && (
            <div className="flex items-center justify-between border-t border-navy-100 bg-ivory-50 px-3 py-2.5 text-[10px] text-navy-500">
              <span>{selectedItems.length ? `تم اختيار ${selectedItems.length}` : 'اختر محاميًا واحدًا أو أكثر'}</span>
              <button type="button" onClick={() => setOpen(false)} className="font-extrabold text-navy-950">
                تم
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChoiceGroup({
  label,
  icon,
  values,
  value,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  values: readonly string[];
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2 text-[11px] font-bold text-navy-700">
        {icon}
        {label}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {values.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={cn(
              'rounded-xl border px-3 py-2.5 text-[11px] font-bold transition',
              value === item
                ? 'border-gold-500 bg-gold-100 text-navy-950'
                : 'border-navy-200 bg-white text-navy-700 hover:border-gold-400',
            )}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function ActionForm({ action, onDone, busy }: { action: Action; onDone: (action: Action) => void; busy: boolean }) {
  const [value, setValue] = React.useState<Action>(action);
  const today = cairoToday();
  const dateOptions = [
    { value: today, label: 'اليوم' },
    { value: addDays(today, 1), label: 'غدًا' },
    { value: addDays(today, 2), label: 'بعد غد' },
    { value: addDays(today, 7), label: 'الأسبوع القادم' },
  ];

  React.useEffect(() => setValue(action), [action]);

  const change = (key: keyof Action, next: unknown) => {
    setValue((state) => ({ ...state, [key]: next }));
  };

  const lawyers = value.choices?.lawyers ?? [];
  const locations = value.choices?.locations ?? [];
  const cases = value.choices?.cases ?? [];

  const complete = {
    ...value,
    missing: undefined,
    choices: undefined,
  };

  return (
    <div className="mt-3 space-y-4 rounded-2xl border border-gold-200 bg-gold-50/60 p-3.5">
      <div className="flex items-center gap-2 text-xs font-extrabold text-navy-950">
        <ClipboardList size={16} className="text-gold-600" />
        مراجعة واختيار البيانات
      </div>

      <ChoiceGroup
        label={value.type === 'create_session' ? 'نوع الجلسة' : 'نوع المهمة'}
        icon={<ClipboardList size={13} className="text-gold-600" />}
        values={value.type === 'create_session' ? sessionTypes : taskTypes}
        value={value.description}
        onChange={(next) => change('description', next)}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <SearchablePicker
          label="المحامي / المحامون"
          placeholder="اكتب للبحث عن اسم المحامي"
          items={lawyers}
          value={value.lawyerIds || []}
          multi
          onChange={(next) => change('lawyerIds', next)}
        />

        <SearchablePicker
          label="المحكمة / الجهة"
          placeholder="اكتب للبحث عن المحكمة أو الجهة"
          items={locations}
          value={value.locationId || ''}
          onChange={(next) => change('locationId', next)}
        />

        {cases.length > 0 && (
          <SearchablePicker
            label="القضية"
            placeholder="ابحث باسم القضية أو رقمها"
            items={cases}
            value={cases.find((item) => item.number === value.caseNumber)?.id || ''}
            onChange={(next) => {
              const selected = cases.find((item) => item.id === next);
              change('caseNumber', selected?.number || undefined);
              change('caseName', selected?.name || undefined);
            }}
          />
        )}

        <div>
          <div className="mb-1.5 flex items-center gap-2 text-[11px] font-bold text-navy-700">
            <CalendarDays size={13} className="text-gold-600" />
            التاريخ
          </div>
          <div className="grid grid-cols-2 gap-2">
            {dateOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => change('scheduledDate', option.value)}
                className={cn(
                  'rounded-xl border px-3 py-2.5 text-[11px] font-bold transition',
                  value.scheduledDate === option.value
                    ? 'border-gold-500 bg-gold-100 text-navy-950'
                    : 'border-navy-200 bg-white text-navy-700 hover:border-gold-400',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <label className="mt-2 flex h-10 cursor-pointer items-center justify-center rounded-xl border border-dashed border-navy-300 bg-white px-3 text-[11px] font-bold text-navy-600 hover:border-gold-400">
            اختيار تاريخ آخر
            <input
              type="date"
              value={value.scheduledDate || ''}
              min={today}
              onChange={(event) => change('scheduledDate', event.target.value || undefined)}
              className="sr-only"
            />
          </label>
          {value.scheduledDate && !dateOptions.some((option) => option.value === value.scheduledDate) && (
            <div className="mt-1 text-center text-[10px] text-navy-400">{dateLabel(value.scheduledDate)}</div>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center gap-2 text-[11px] font-bold text-navy-700">
            <Clock3 size={13} className="text-gold-600" />
            الوقت
          </div>
          <div className="grid grid-cols-4 gap-2">
            {timeOptions.map((time) => (
              <button
                key={time}
                type="button"
                onClick={() => change('scheduledTime', time)}
                className={cn(
                  'rounded-xl border px-2 py-2.5 text-[11px] font-bold transition',
                  value.scheduledTime === time
                    ? 'border-gold-500 bg-gold-100 text-navy-950'
                    : 'border-navy-200 bg-white text-navy-700 hover:border-gold-400',
                )}
              >
                {time}
              </button>
            ))}
          </div>
          <label className="mt-2 flex h-10 cursor-pointer items-center justify-center rounded-xl border border-dashed border-navy-300 bg-white px-3 text-[11px] font-bold text-navy-600 hover:border-gold-400">
            اختيار وقت آخر
            <input
              type="time"
              value={value.scheduledTime || ''}
              onChange={(event) => change('scheduledTime', event.target.value || undefined)}
              className="sr-only"
            />
          </label>
        </div>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => onDone(complete)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold-500 px-4 py-3 text-xs font-extrabold text-navy-950 disabled:opacity-60"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
        تأكيد وتنفيذ
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
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function OfficeAssistant() {
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [configured, setConfigured] = React.useState<boolean | null>(null);
  const [loaded, setLoaded] = React.useState(false);

  const resetHome = () => {
    setMessages([]);
    setInput('');
    setBusy(false);
  };

  const load = React.useCallback(async () => {
    if (loaded) return;
    try {
      const response = await fetch('/api/assistant', { cache: 'no-store' });
      const data = await response.json();
      setConfigured(Boolean(data.configured));
    } catch {
      setConfigured(false);
    } finally {
      setLoaded(true);
    }
  }, [loaded]);

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const submit = async (text: string, action?: Action, finalize = false) => {
    const message = text.trim();
    if (!message || busy) return;
    setInput('');
    setMessages((items) => [...items, { role: 'user', text: message }]);
    setBusy(true);

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action ? { message, action, confirm: finalize } : { message }),
      });
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream') && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let answer = '';
        let assistantIndex = -1;

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
                setMessages((items) => {
                  const copy = [...items];
                  if (assistantIndex < 0) {
                    assistantIndex = copy.length;
                    copy.push({ role: 'assistant', text: event.text });
                  } else {
                    copy[assistantIndex] = { ...copy[assistantIndex], text: copy[assistantIndex].text + event.text };
                  }
                  return copy;
                });
              } else if (event.type === 'done' && event.action) {
                setMessages((items) =>
                  items.map((item, index) =>
                    index === assistantIndex
                      ? { ...item, action: event.action, text: '' }
                      : item,
                  ),
                );
              } else if (event.type === 'done' && event.success) {
                setMessages((items) => [
                  ...items,
                  {
                    role: 'assistant',
                    text: event.reply || 'تم التنفيذ بنجاح.',
                    success: true,
                    nav: event.navigation,
                  },
                ]);
              } else if (event.type === 'error') {
                setMessages((items) => [...items, { role: 'assistant', text: event.error || 'تعذر تنفيذ الطلب.' }]);
              }
            } catch {
              // Ignore malformed SSE frames and continue receiving the stream.
            }
          }
        }

        if (!answer && assistantIndex < 0) {
          setMessages((items) => [...items, { role: 'assistant', text: 'تم استلام الطلب.' }]);
        }
      } else {
        const data = await response.json();
        setMessages((items) => [
          ...items,
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
      setMessages((items) => [...items, { role: 'assistant', text: 'تعذر الاتصال بالمساعد حاليًا.' }]);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (action: Action) => {
    await submit('تأكيد وتنفيذ', action, true);
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
          <div dir="rtl" className="flex h-[min(800px,calc(100vh-24px))] w-full max-w-[720px] flex-col overflow-hidden rounded-[28px] border border-navy-200 bg-white shadow-2xl">
            <header className="flex items-center justify-between bg-navy-950 px-5 py-4 text-white">
              <div>
                <div className="flex items-center gap-2 font-extrabold">
                  <Sparkles size={17} className="text-gold-400" />
                  مساعد المكتب الذكي
                </div>
                <p className="mt-1 text-[10px] text-white/55">اختر بالضغط والبحث. والكتابة متاحة عند الحاجة.</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={resetHome}
                  aria-label="العودة إلى الصفحة الرئيسية للمساعد"
                  title="الرئيسية"
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-extrabold text-white hover:bg-white/10"
                >
                  <Home size={17} />
                  <span>الرئيسية</span>
                </button>
                <button onClick={() => setOpen(false)} aria-label="إغلاق" className="rounded-xl p-2 hover:bg-white/10">
                  <X size={19} />
                </button>
              </div>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto bg-ivory-50 p-4">
              {configured === false && messages.length === 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900">
                  مفتاح Gemini غير مضبوط حاليًا.
                </div>
              )}

              {messages.length === 0 && (
                <div>
                  <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-navy-900">
                    <ClipboardList size={17} className="text-gold-600" />
                    اختر ما تريد
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {quick.map(([label, text]) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => void submit(text)}
                        className="rounded-2xl border border-navy-100 bg-white p-4 text-start text-sm font-extrabold text-navy-800 shadow-sm transition hover:-translate-y-0.5 hover:border-gold-400"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    'max-w-[96%] rounded-2xl px-4 py-3 text-sm leading-7',
                    message.role === 'user'
                      ? 'ms-auto bg-navy-950 text-white'
                      : 'me-auto border border-navy-100 bg-white text-navy-800 shadow-sm',
                  )}
                >
                  {!message.action && (
                    <div className="whitespace-pre-wrap">{cleanAssistantText(message.text)}</div>
                  )}

                  {message.action?.missing?.length ? (
                    <ActionForm action={message.action} onDone={(next) => void submit('استكمال البيانات', next)} busy={busy} />
                  ) : message.action ? (
                    <ActionForm action={message.action} onDone={(next) => void confirm(next)} busy={busy} />
                  ) : null}

                  {message.nav && (
                    <a
                      href={message.nav.path}
                      className="mt-3 inline-flex items-center gap-2 rounded-xl bg-navy-950 px-4 py-2.5 text-xs font-extrabold text-white"
                    >
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
                void submit(input);
              }}
              className="flex gap-2 border-t border-navy-100 bg-white p-3"
            >
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="اكتب طلبك هنا عند الحاجة"
                className="min-w-0 flex-1 rounded-xl border border-navy-200 px-4 py-3 text-sm outline-none focus:border-gold-500"
              />
              <button
                type="submit"
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
