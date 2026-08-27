'use client';

import * as React from 'react';
import Link from 'next/link';
import { Landmark, Building2, CalendarClock, Filter, RotateCcw, Search } from 'lucide-react';
import { Badge, Card, EmptyState, Input, Select } from '@/components/ui';
import { LOCATION_TYPE_LABEL } from '@/lib/constants';

export type LocationRow = {
  id: string;
  slug: string;
  name: string;
  nameEn: string | null;
  type: string;
  subType: string | null;
  governorate: string | null;
  city: string | null;
  distanceBucket: string | null;
  /** ISO date (yyyy-mm-dd) of the nearest upcoming task, or null. */
  nextTaskDate: string | null;
  nextTaskLabel: string | null;
  upcoming: number;
};

function readParam(key: string): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get(key) ?? '';
}

/**
 * Client-side filtering for the locations directory: governorate + type +
 * distance bucket + free text. The two-section ordering (upcoming activity
 * first, then alphabetical by type) is preserved inside each filtered result.
 */
export function LocationsClient({
  rows,
  governorates,
  types,
  buckets,
}: {
  rows: LocationRow[];
  governorates: string[];
  types: string[];
  buckets: string[];
}) {
  const [governorate, setGovernorate] = React.useState('');
  const [type, setType] = React.useState('');
  const [bucket, setBucket] = React.useState('');
  const [q, setQ] = React.useState('');
  const hydrated = React.useRef(false);

  // Hydrate from the query string once, so a filtered view stays shareable.
  React.useEffect(() => {
    setGovernorate(readParam('governorate'));
    setType(readParam('type'));
    setBucket(readParam('bucket'));
    setQ(readParam('q'));
    hydrated.current = true;
  }, []);

  // Reflect the active filters back into the URL (no navigation / no refetch).
  React.useEffect(() => {
    if (typeof window === 'undefined' || !hydrated.current) return;
    const p = new URLSearchParams();
    if (governorate) p.set('governorate', governorate);
    if (type) p.set('type', type);
    if (bucket) p.set('bucket', bucket);
    if (q.trim()) p.set('q', q.trim());
    const qs = p.toString();
    window.history.replaceState(null, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
  }, [governorate, type, bucket, q]);

  const needle = q.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    if (governorate && r.governorate !== governorate) return false;
    if (type && r.type !== type) return false;
    if (bucket && r.distanceBucket !== bucket) return false;
    if (needle) {
      const hay = [r.name, r.nameEn, r.subType, r.governorate, r.city].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });

  const active = filtered.filter((r) => r.nextTaskDate);
  const rest = filtered.filter((r) => !r.nextTaskDate);
  const hasFilters = !!(governorate || type || bucket || q.trim());

  const reset = () => {
    setGovernorate('');
    setType('');
    setBucket('');
    setQ('');
  };

  return (
    <>
      <Card className="mb-6 p-3.5">
        <div className="mb-2.5 flex items-center gap-2 text-[12px] font-extrabold text-navy-700">
          <Filter size={14} className="text-gold-600" />
          تصفية الأماكن
          <span className="text-[11px] font-bold text-navy-300">({filtered.length} من {rows.length})</span>
          {hasFilters && (
            <button onClick={reset} className="ms-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold text-gold-700 hover:bg-gold-500/10">
              <RotateCcw size={12} />
              مسح الفلاتر
            </button>
          )}
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <label className="relative block">
            <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-navy-300" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث بالاسم أو المدينة…"
              className="ps-9"
              aria-label="بحث في الأماكن"
            />
          </label>
          <Select value={governorate} onChange={(e) => setGovernorate(e.target.value)} aria-label="المحافظة">
            <option value="">كل المحافظات</option>
            {governorates.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </Select>
          <Select value={type} onChange={(e) => setType(e.target.value)} aria-label="النوع">
            <option value="">كل الأنواع</option>
            {types.map((t) => (
              <option key={t} value={t}>{LOCATION_TYPE_LABEL[t] ?? t}</option>
            ))}
          </Select>
          <Select value={bucket} onChange={(e) => setBucket(e.target.value)} aria-label="المسافة من المكتب">
            <option value="">كل المسافات من المكتب</option>
            {buckets.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </Select>
        </div>
      </Card>

      <section className="mb-10">
        <h2 className="mb-3 flex items-center gap-2 text-[14px] font-extrabold text-navy-800">
          <CalendarClock size={17} className="text-gold-600" />
          أنشطة قادمة — حسب أقرب تاريخ
          <span className="text-[11px] font-bold text-navy-300">({active.length})</span>
        </h2>
        {active.length === 0 ? (
          <EmptyState
            title={hasFilters ? 'لا توجد أماكن بمهام قادمة ضمن هذه الفلاتر.' : 'لا توجد مهام قادمة حالياً.'}
            hint="بمجرد جدولة مهمة سيظهر مكانها هنا في مقدمة القائمة."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {active.map((l) => (
              <LocationCard key={l.id} row={l} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-[14px] font-extrabold text-navy-800">
          <Building2 size={17} className="text-gold-600" />
          كل الأماكن — ترتيب أبجدي حسب النوع
          <span className="text-[11px] font-bold text-navy-300">({rest.length})</span>
        </h2>
        {rest.length === 0 ? (
          <EmptyState
            title={hasFilters ? 'لا توجد نتائج مطابقة للفلاتر.' : 'لا أماكن أخرى بعد.'}
            hint="المحاكم، النيابات، الشهر العقاري، الضرائب، السجل التجاري…"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rest.map((l) => (
              <LocationCard key={l.id} row={l} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function LocationCard({ row }: { row: LocationRow }) {
  const isCourt = row.type === 'COURT';
  return (
    <Link href={`/locations/${row.slug}`}>
      <Card className="group h-full p-4 transition hover:border-gold-500 hover:shadow-md">
        <div className="flex items-start gap-3">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${isCourt ? 'bg-navy-950 text-gold-400' : 'bg-navy-800 text-ivory-200'}`}>
            {isCourt ? <Landmark size={20} /> : <Building2 size={20} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-extrabold text-navy-950 group-hover:text-navy-800">{row.name}</p>
            <p className="mt-0.5 truncate text-[11px] font-bold text-navy-300">
              {LOCATION_TYPE_LABEL[row.type] ?? row.type}
              {row.governorate ? ` — ${row.governorate}` : ''}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {row.nextTaskLabel ? (
                <Badge tone="gold">
                  <CalendarClock size={11} />
                  أقرب موعد: {row.nextTaskLabel}
                </Badge>
              ) : (
                <Badge tone="gray">لا نشاطات قادمة</Badge>
              )}
              {row.distanceBucket && <Badge tone="outline">{row.distanceBucket}</Badge>}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
