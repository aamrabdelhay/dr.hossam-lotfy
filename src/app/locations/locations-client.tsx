'use client';

import * as React from 'react';
import Link from 'next/link';
import { Landmark, Building2, CalendarClock, Filter, RotateCcw, Search, MapPin, Phone, ExternalLink, Navigation, ShieldCheck, Clock3 } from 'lucide-react';
import { Badge, Card, EmptyState, Input, Select } from '@/components/ui';
import { LOCATION_TYPE_LABEL } from '@/lib/constants';
import { haversineKm, googleDirectionsUrl } from '@/lib/legal-directory';

export type LocationRow = {
  id: string;
  slug: string;
  name: string;
  nameEn: string | null;
  type: string;
  category: string;
  subType: string | null;
  governorate: string | null;
  city: string | null;
  district: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  googleMapsUrl: string | null;
  lat: number | null;
  lng: number | null;
  workingHours: string | null;
  services: string[];
  jurisdiction: string | null;
  requiresPersonal: boolean;
  hasOnlineService: boolean;
  source: string | null;
  lastVerified: string | null;
  confidence: string | null;
  distanceFromDokki: number | null;
  distanceBucket: string | null;
  searchKeywords: string[];
  nextTaskDate: string | null;
  nextTaskLabel: string | null;
  upcoming: number;
};

function readParam(key: string): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get(key) ?? '';
}

export function LocationsClient({
  rows,
  governorates,
  types,
  categories,
  buckets,
}: {
  rows: LocationRow[];
  governorates: string[];
  types: string[];
  categories: string[];
  buckets: string[];
}) {
  const [governorate, setGovernorate] = React.useState('');
  const [type, setType] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [bucket, setBucket] = React.useState('');
  const [q, setQ] = React.useState('');
  const [sort, setSort] = React.useState<'distance' | 'name' | 'activity'>('distance');
  const [nearby, setNearby] = React.useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = React.useState('');
  const hydrated = React.useRef(false);

  React.useEffect(() => {
    setGovernorate(readParam('governorate'));
    setType(readParam('type'));
    setCategory(readParam('category'));
    setBucket(readParam('bucket'));
    setQ(readParam('q'));
    const requestedSort = readParam('sort');
    if (requestedSort === 'name' || requestedSort === 'activity' || requestedSort === 'distance') setSort(requestedSort);
    hydrated.current = true;
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !hydrated.current) return;
    const p = new URLSearchParams();
    if (governorate) p.set('governorate', governorate);
    if (type) p.set('type', type);
    if (category) p.set('category', category);
    if (bucket) p.set('bucket', bucket);
    if (q.trim()) p.set('q', q.trim());
    if (sort !== 'distance') p.set('sort', sort);
    const qs = p.toString();
    window.history.replaceState(null, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
  }, [governorate, type, category, bucket, q, sort]);

  const needle = q.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    if (governorate && r.governorate !== governorate) return false;
    if (type && r.type !== type) return false;
    if (category && r.category !== category) return false;
    if (bucket && r.distanceBucket !== bucket) return false;
    if (needle) {
      const hay = [r.name, r.nameEn, r.category, r.subType, r.governorate, r.city, r.district, r.address, r.jurisdiction, ...r.services, ...r.searchKeywords].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (nearby && a.lat != null && a.lng != null && b.lat != null && b.lng != null) {
      return haversineKm(nearby.lat, nearby.lng, a.lat, a.lng) - haversineKm(nearby.lat, nearby.lng, b.lat, b.lng);
    }
    if (sort === 'name') return a.name.localeCompare(b.name, 'ar');
    if (sort === 'activity') {
      if (!!a.nextTaskDate !== !!b.nextTaskDate) return a.nextTaskDate ? -1 : 1;
      return (a.nextTaskDate ?? '9999').localeCompare(b.nextTaskDate ?? '9999');
    }
    return (a.distanceFromDokki ?? Number.POSITIVE_INFINITY) - (b.distanceFromDokki ?? Number.POSITIVE_INFINITY);
  });

  const active = sorted.filter((r) => r.nextTaskDate);
  const rest = sorted.filter((r) => !r.nextTaskDate);
  const hasFilters = !!(governorate || type || category || bucket || q.trim() || nearby);

  const reset = () => {
    setGovernorate(''); setType(''); setCategory(''); setBucket(''); setQ(''); setSort('distance'); setNearby(null); setGeoError('');
  };

  const locateMe = () => {
    if (!navigator.geolocation) { setGeoError('المتصفح لا يدعم تحديد الموقع.'); return; }
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (position) => setNearby({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => setGeoError('تعذر الوصول إلى موقعك. اسمح بالموقع من إعدادات المتصفح ثم حاول مرة أخرى.'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  return (
    <>
      <Card className="mb-6 p-3.5">
        <div className="mb-2.5 flex flex-wrap items-center gap-2 text-[12px] font-extrabold text-ivory-300">
          <Filter size={14} className="text-gold-500" />
          بحث وتصفية دليل المحامي
          <span className="text-[11px] font-bold text-navy-300">({filtered.length} من {rows.length})</span>
          {hasFilters && <button onClick={reset} className="ms-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold text-gold-500 hover:bg-gold-500/10"><RotateCcw size={12} />مسح الفلاتر</button>}
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <label className="relative block xl:col-span-2">
            <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-navy-300" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالجهة أو الخدمة أو المحكمة…" className="ps-9" aria-label="بحث في دليل المحامي" />
          </label>
          <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="التصنيف"><option value="">كل التصنيفات</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
          <Select value={governorate} onChange={(e) => setGovernorate(e.target.value)} aria-label="المحافظة"><option value="">كل المحافظات</option>{governorates.map((g) => <option key={g} value={g}>{g}</option>)}</Select>
          <Select value={type} onChange={(e) => setType(e.target.value)} aria-label="النوع"><option value="">كل الأنواع</option>{types.map((t) => <option key={t} value={t}>{LOCATION_TYPE_LABEL[t] ?? t}</option>)}</Select>
          <Select value={bucket} onChange={(e) => setBucket(e.target.value)} aria-label="المسافة"><option value="">كل المسافات</option>{buckets.map((b) => <option key={b} value={b}>{b}</option>)}</Select>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="ترتيب النتائج"><option value="distance">الأقرب من الدقي</option><option value="activity">أقرب جلسة أولاً</option><option value="name">الاسم أبجديًا</option></Select>
          <button type="button" onClick={locateMe} className="inline-flex items-center gap-1.5 rounded-md border border-navy-200 px-3 py-2 text-[11px] font-extrabold text-ivory-300 hover:border-gold-500 hover:text-ivory-50"><Navigation size={13} />الأقرب إليّ</button>
          {nearby && <Badge tone="gold"><MapPin size={11} />تم تفعيل ترتيب موقعك</Badge>}
          {geoError && <span className="text-[11px] font-bold text-red-600">{geoError}</span>}
        </div>
      </Card>

      {nearby && <div className="mb-5 rounded-lg border border-gold-500/20 bg-gold-500/5 px-4 py-3 text-[12px] font-bold text-ivory-300">النتائج الآن مرتبة حسب المسافة من موقعك. لا يتم إرسال الإحداثيات إلى الخادم.</div>}

      <section className="mb-10">
        <h2 className="mb-3 flex items-center gap-2 text-[14px] font-extrabold text-ivory-200"><CalendarClock size={17} className="text-gold-500" />أنشطة قادمة — حسب أقرب تاريخ <span className="text-[11px] font-bold text-navy-300">({active.length})</span></h2>
        {active.length === 0 ? <EmptyState title={hasFilters ? 'لا توجد نتائج مطابقة.' : 'لا توجد مهام قادمة حالياً.'} hint="يمكنك البحث عن أي محكمة أو جهة أو خدمة من الفلاتر أعلاه." /> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{active.map((l) => <LocationCard key={l.id} row={l} nearby={nearby} />)}</div>}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-[14px] font-extrabold text-ivory-200"><Building2 size={17} className="text-gold-500" />كل الجهات والأماكن <span className="text-[11px] font-bold text-navy-300">({rest.length})</span></h2>
        {rest.length === 0 ? <EmptyState title={hasFilters ? 'لا توجد نتائج مطابقة للفلاتر.' : 'لا أماكن أخرى بعد.'} hint="المحاكم، النيابات، الشهر العقاري، الضرائب، السجل التجاري، النقابة والجهات الحكومية." /> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{rest.map((l) => <LocationCard key={l.id} row={l} nearby={nearby} />)}</div>}
      </section>
    </>
  );
}

function LocationCard({ row, nearby }: { row: LocationRow; nearby: { lat: number; lng: number } | null }) {
  const isCourt = row.type === 'COURT';
  const personalDistance = nearby && row.lat != null && row.lng != null ? haversineKm(nearby.lat, nearby.lng, row.lat, row.lng) : null;
  const directions = row.googleMapsUrl || googleDirectionsUrl(row.lat, row.lng);
  return (
    <Card className="group h-full p-4 transition hover:border-gold-500 hover:shadow-md">
      <div className="flex items-start gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${isCourt ? 'bg-navy-950 text-gold-400' : 'bg-navy-800 text-ivory-200'}`}>{isCourt ? <Landmark size={20} /> : <Building2 size={20} />}</span>
        <div className="min-w-0 flex-1">
          <Link href={`/locations/${row.slug}`} className="block"><p className="text-[14px] font-extrabold text-ivory-50 group-hover:text-ivory-200">{row.name}</p></Link>
          <p className="mt-0.5 text-[11px] font-bold text-navy-300">{row.category} — {row.subType || (LOCATION_TYPE_LABEL[row.type] ?? row.type)}</p>
          {(row.city || row.governorate) && <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-navy-400"><MapPin size={11} />{[row.city, row.governorate].filter(Boolean).join(' — ')}</p>}
          {row.address && <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-5 text-navy-400">{row.address}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {personalDistance != null ? <Badge tone="gold">{personalDistance.toFixed(1)} كم منك</Badge> : row.distanceFromDokki != null ? <Badge tone="outline">{row.distanceFromDokki.toFixed(1)} كم من الدقي</Badge> : row.distanceBucket ? <Badge tone="outline">{row.distanceBucket}</Badge> : null}
            {row.nextTaskLabel && <Badge tone="gold"><CalendarClock size={11} />{row.nextTaskLabel}</Badge>}
            {row.hasOnlineService && <Badge tone="gray">خدمة إلكترونية</Badge>}
            {row.confidence === 'عالية' && <Badge tone="gray"><ShieldCheck size={11} />موثق</Badge>}
          </div>
        </div>
      </div>
      {row.services.length > 0 && <div className="mt-3 border-t border-navy-100 pt-3"><p className="mb-1 text-[10px] font-extrabold text-navy-400">خدمات بارزة</p><div className="flex flex-wrap gap-1">{row.services.slice(0, 4).map((s) => <span key={s} className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-semibold text-navy-300">{s}</span>)}</div></div>}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Link href={`/locations/${row.slug}`} className="inline-flex items-center gap-1 rounded-md bg-navy-950 px-2.5 py-1.5 text-[10px] font-extrabold text-white hover:bg-navy-800">التفاصيل</Link>
        {directions && <a href={directions} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-navy-200 px-2.5 py-1.5 text-[10px] font-extrabold text-ivory-300 hover:border-gold-500"><Navigation size={11} />الاتجاهات</a>}
        {row.googleMapsUrl && <a href={row.googleMapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-navy-200 px-2.5 py-1.5 text-[10px] font-extrabold text-ivory-300 hover:border-gold-500"><ExternalLink size={11} />خرائط</a>}
        {row.phone && <a href={`tel:${row.phone}`} className="inline-flex items-center gap-1 rounded-md border border-navy-200 px-2.5 py-1.5 text-[10px] font-extrabold text-ivory-300 hover:border-gold-500"><Phone size={11} />اتصال</a>}
      </div>
      {(row.workingHours || row.lastVerified) && <div className="mt-2 flex flex-wrap gap-2 text-[9px] font-semibold text-navy-300">{row.workingHours && <span className="inline-flex items-center gap-1"><Clock3 size={10} />{row.workingHours}</span>}{row.lastVerified && <span>آخر تحقق: {new Date(row.lastVerified).toLocaleDateString('ar-EG')}</span>}</div>}
    </Card>
  );
}
