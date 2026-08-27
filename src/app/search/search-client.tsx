'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Landmark, Scale, Building2, CalendarDays, Loader2 } from 'lucide-react';
import { Avatar, Badge, Card, EmptyState, Select, Input } from '@/components/ui';
import { SessionCard } from '@/components/session-card';
import { LOCATION_TYPE_LABEL, TITLE_LABEL } from '@/lib/constants';
import type { TaskVM } from '@/lib/queries';

type Type = 'court' | 'location' | 'lawyer' | 'session' | 'all';

type LocationResult = { id: string; slug: string; name: string; type: string; upcoming: number };
type LawyerResult = { id: string; slug: string; name: string; title: string; photo: string | null; upcoming: number; isPrincipal: boolean };

export function SearchPageClient() {
  const sp = useSearchParams();
  const [type, setType] = React.useState<Type>((sp.get('type') as Type) || 'all');
  const [q, setQ] = React.useState(sp.get('q') ?? '');
  const [input, setInput] = React.useState(sp.get('q') ?? '');
  const [results, setResults] = React.useState<null | {
    locations: LocationResult[];
    lawyers: LawyerResult[];
    sessions: TaskVM[];
  }>(null);
  const [loading, setLoading] = React.useState(false);
  const [searched, setSearched] = React.useState(false);

  const runSearch = React.useCallback(
    async (term: string, t: Type) => {
      const termTrim = term.trim();
      setSearched(true);
      if (!termTrim || t === 'all' && false) {
        setResults(null);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(termTrim)}&type=${t}`);
        if (res.ok) {
          setResults(await res.json());
        }
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // debounce
  React.useEffect(() => {
    const h = setTimeout(() => {
      setQ(input);
      if (input.trim()) runSearch(input, type);
      else {
        setResults(null);
        setSearched(false);
      }
    }, 280);
    return () => clearTimeout(h);
  }, [input, type, runSearch]);

  const showLocations = type === 'court' || type === 'location' || type === 'all';
  const showLawyers = type === 'lawyer' || type === 'all';
  const showSessions = type === 'session' || type === 'all';

  const total = results ? (showLocations ? results.locations.length : 0) + (showLawyers ? results.lawyers.length : 0) + (showSessions ? results.sessions.length : 0) : 0;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5">
        <h1 className="text-xl font-extrabold text-navy-950">البحث</h1>
        <p className="mt-1 text-[13px] font-medium text-navy-400">
          ابحث عن محكمة أو مكان قانوني أو محامي أو جلسة — يدعم البحث الجزئي بالعربية والإنجليزية.
        </p>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={type} onChange={(e) => setType(e.target.value as Type)} className="sm:w-44" aria-label="نوع البحث">
            <option value="all">الكل</option>
            <option value="court">محكمة</option>
            <option value="location">مكان</option>
            <option value="lawyer">محامي</option>
            <option value="session">جلسة</option>
          </Select>
          <div className="relative flex-1">
            <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-navy-300" />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="مثال: جنوب القاهرة / هيئة الاستثمار / أحمد محمد…"
              className="h-11 ps-10 text-[14px]"
              autoFocus
            />
          </div>
        </div>
      </Card>

      <div className="mt-5 space-y-6">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-navy-400">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-[13px] font-bold">جارٍ البحث…</span>
          </div>
        )}

        {!loading && searched && !q.trim() && (
          <EmptyState title="اكتب كلمة للبحث" hint="اختر النوع ثم اكتب اسم المحكمة أو المكان أو المحامي." />
        )}

        {!loading && q.trim() && results && (
          <>
            <p className="text-[12px] font-bold text-navy-400">
              {total === 0 ? 'لا توجد نتائج مطابقة' : `${total} نتيجة مطابقة`}
            </p>

            {showLocations && results.locations.length > 0 && (
              <section>
                <h2 className="mb-2.5 flex items-center gap-2 text-[13px] font-extrabold text-navy-800">
                  <Landmark size={15} className="text-gold-600" />
                  المحاكم والأماكن
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {results.locations.map((l) => (
                    <Link key={l.id} href={`/locations/${l.slug}`}>
                      <Card className="h-full p-4 transition hover:border-gold-500 hover:shadow-md">
                        <div className="flex items-start gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-950 text-gold-400">
                            {l.type === 'COURT' ? <Landmark size={18} /> : <Building2 size={18} />}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-extrabold text-navy-950">{l.name}</p>
                            <p className="mt-0.5 text-[11px] font-bold text-navy-300">{LOCATION_TYPE_LABEL[l.type] ?? l.type}</p>
                            {l.upcoming > 0 && <Badge tone="gold" className="mt-1.5">{l.upcoming} جلسة قادمة</Badge>}
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {showLawyers && results.lawyers.length > 0 && (
              <section>
                <h2 className="mb-2.5 flex items-center gap-2 text-[13px] font-extrabold text-navy-800">
                  <Scale size={15} className="text-gold-600" />
                  المحامون
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {results.lawyers.map((l) => (
                    <Link key={l.id} href={`/lawyers/${l.slug}`}>
                      <Card className="h-full p-4 transition hover:border-gold-500 hover:shadow-md">
                        <div className="flex items-center gap-3">
                          <Avatar name={l.name} src={l.photo} size={44} ring={l.isPrincipal} />
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-extrabold text-navy-950">{l.name}</p>
                            <p className="text-[11px] font-bold text-navy-300">{TITLE_LABEL[l.title] ?? l.title}</p>
                            {l.upcoming > 0 && <Badge tone="gold" className="mt-1">{l.upcoming} مهمة قادمة</Badge>}
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {showSessions && results.sessions.length > 0 && (
              <section>
                <h2 className="mb-2.5 flex items-center gap-2 text-[13px] font-extrabold text-navy-800">
                  <CalendarDays size={15} className="text-gold-600" />
                  الجلسات
                </h2>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {results.sessions.map((t) => (
                    <SessionCard key={t.id} task={t} />
                  ))}
                </div>
              </section>
            )}

            {total === 0 && (
              <EmptyState title="لا توجد نتائج" hint="جرّب كلمة أقصر أو نوع بحث مختلفاً." />
            )}
          </>
        )}

        {!loading && !q.trim() && (
          <div className="rounded-xl border border-dashed border-navy-200 bg-white/60 px-6 py-10 text-center">
            <Search size={30} className="mx-auto text-navy-200" />
            <p className="mt-3 text-sm font-bold text-navy-500">ابدأ الكتابة لعرض النتائج فوراً</p>
            <p className="mt-1 text-xs font-medium text-navy-300">
              أمثلة: «محكمة جنوب القاهرة» • «هيئة الاستثمار» • «أحمد محمد»
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
