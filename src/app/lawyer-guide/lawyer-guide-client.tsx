'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Search, MapPin, Navigation, Filter, RotateCcw, ShieldCheck,
  Clock3, Phone, ExternalLink, Building2, Landmark, ChevronDown,
  LayoutGrid, Map as MapIcon, Globe, Eye, X,
} from 'lucide-react';
import { Badge, Card, EmptyState, Input, Select } from '@/components/ui';
import { LOCATION_TYPE_LABEL } from '@/lib/constants';
import { haversineKm, googleDirectionsUrl, DOKKI_ORIGIN } from '@/lib/legal-directory';

export type LawyerGuideLocation = {
  id: string;
  slug: string;
  name: string;
  nameEn: string | null;
  type: string;
  subType: string | null;
  governorate: string | null;
  city: string | null;
  district: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  officialUrl: string | null;
  googleMapsUrl: string | null;
  lat: number | null;
  lng: number | null;
  workingHours: string | null;
  requiresPersonal: boolean;
  hasOnlineService: boolean;
  confidence: string | null;
  confidenceLevel: string;
  verificationStatus: string;
  lastVerified: string | null;
  distanceFromDokki: number | null;
  distanceBucket: string | null;
  category: { id: string; nameAr: string; nameEn: string; slug: string } | null;
  services: Array<{ id: string; nameAr: string; nameEn: string; slug: string; onlineAvailable: boolean }>;
};

const BUCKETS = ['0-5كم', '5-10كم', '10-20كم', '20-40كم', '40-75كم', '75-150كم', '150-300كم', '300+كم'];
const SORT_OPTIONS = [
  { value: 'relevance', label: 'الأكثر صلة' },
  { value: 'nearest', label: 'الأقرب' },
  { value: 'farthest', label: 'الأبعد' },
  { value: 'name', label: 'الاسم أبجدياً' },
  { value: 'verified', label: 'الأحدث تحققاً' },
  { value: 'confidence', label: 'أعلى ثقة' },
];

const DAY_LABELS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export function LawyerGuideClient({
  locations,
  categories,
  governorates,
  totalCount,
}: {
  locations: LawyerGuideLocation[];
  categories: Array<{ id: string; nameAr: string; nameEn: string; slug: string }>;
  governorates: string[];
  totalCount: number;
}) {
  const [q, setQ] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [governorate, setGovernorate] = React.useState('');
  const [sort, setSort] = React.useState('relevance');
  const [verifiedOnly, setVerifiedOnly] = React.useState(false);
  const [openNow, setOpenNow] = React.useState(false);
  const [physicalOnly, setPhysicalOnly] = React.useState(false);
  const [onlineOnly, setOnlineOnly] = React.useState(false);
  const [bucket, setBucket] = React.useState('');
  const [nearby, setNearby] = React.useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = React.useState('');
  const [viewMode, setViewMode] = React.useState<'list' | 'grid'>('list');
  const [showFilters, setShowFilters] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const perPage = 24;

  const normalizeAr = (s: string) =>
    s.replace(/[\u064B-\u065F\u0670]/g, '').replace(/[\u0622\u0623\u0625\u0627]/g, 'ا').replace(/\u0649/g, 'ي').replace(/\u0629/g, 'ه').replace(/\u0640/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

  const filtered = React.useMemo(() => {
    let result = locations;

    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      const normalizedNeedle = normalizeAr(q.trim());
      result = result.filter((r) => {
        const hay = [r.name, r.nameEn, r.address, r.subType, r.governorate, r.city, r.district, r.category?.nameAr, r.category?.nameEn, ...r.services.map((s) => s.nameAr)].filter(Boolean).join(' ').toLowerCase();
        const hayNorm = normalizeAr(hay);
        return hay.includes(needle) || hayNorm.includes(normalizedNeedle);
      });
    }

    if (category) result = result.filter((r) => r.category?.id === category);
    if (governorate) result = result.filter((r) => r.governorate === governorate);
    if (bucket) result = result.filter((r) => r.distanceBucket === bucket);
    if (verifiedOnly) result = result.filter((r) => r.verificationStatus === 'VERIFIED');
    if (physicalOnly) result = result.filter((r) => r.requiresPersonal);
    if (onlineOnly) result = result.filter((r) => r.hasOnlineService);

    // Sort
    const sorted = [...result];
    if (nearby) {
      sorted.sort((a, b) => {
        const da = a.lat != null && a.lng != null ? haversineKm(nearby.lat, nearby.lng, a.lat, a.lng) : Infinity;
        const db = b.lat != null && b.lng != null ? haversineKm(nearby.lat, nearby.lng, b.lat, b.lng) : Infinity;
        return da - db;
      });
    } else if (sort === 'nearest') {
      sorted.sort((a, b) => (a.distanceFromDokki ?? Infinity) - (b.distanceFromDokki ?? Infinity));
    } else if (sort === 'farthest') {
      sorted.sort((a, b) => (b.distanceFromDokki ?? -1) - (a.distanceFromDokki ?? -1));
    } else if (sort === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    } else if (sort === 'verified') {
      sorted.sort((a, b) => {
        if (!a.lastVerified) return 1;
        if (!b.lastVerified) return -1;
        return b.lastVerified.localeCompare(a.lastVerified);
      });
    } else {
      // relevance = distance + name
      sorted.sort((a, b) => (a.distanceFromDokki ?? Infinity) - (b.distanceFromDokki ?? Infinity) || a.name.localeCompare(b.name, 'ar'));
    }

    return sorted;
  }, [locations, q, category, governorate, bucket, sort, verifiedOnly, physicalOnly, onlineOnly, nearby]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const pageItems = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  React.useEffect(() => { setCurrentPage(1); }, [q, category, governorate, bucket, sort, verifiedOnly, physicalOnly, onlineOnly, nearby]);

  const hasFilters = !!(q || category || governorate || bucket || verifiedOnly || physicalOnly || onlineOnly || nearby);

  const reset = () => {
    setQ(''); setCategory(''); setGovernorate(''); setSort('relevance');
    setVerifiedOnly(false); setOpenNow(false); setPhysicalOnly(false); setOnlineOnly(false);
    setBucket(''); setNearby(null); setGeoError('');
  };

  const locateMe = () => {
    if (!navigator.geolocation) { setGeoError('المتصفح لا يدعم تحديد الموقع.'); return; }
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => setNearby({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeoError('تعذر الوصول إلى موقعك. اسمح بالوصول من إعدادات المتصفح.'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  const goToOffice = () => {
    setNearby({ lat: DOKKI_ORIGIN.lat, lng: DOKKI_ORIGIN.lng });
  };

  const isOpenNow = (workingHours: string | null): boolean => {
    if (!workingHours) return false;
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    // Arabic work hours: Sunday-Thursday 9-14
    if (workingHours.includes('الأحد') && day >= 0 && day <= 4 && hour >= 9 && hour < 14) return true;
    return false;
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-extrabold text-ivory-50" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
          دليل المحامي في مصر
        </h1>
        <p className="mt-2 text-[13px] font-medium text-navy-400">
          المحاكم والجهات الحكومية والنقابية والخدمية التي يحتاجها المحامي
        </p>
      </div>

      {/* Search bar */}
      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-navy-300" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث عن محكمة، جهة، خدمة أو إجراء..."
              className="h-10 ps-10 text-[14px]"
              aria-label="بحث في دليل المحامي"
            />
          </div>
          <button
            type="button"
            onClick={locateMe}
            className="inline-flex items-center gap-1.5 rounded-md border border-navy-200 bg-navy-850 px-3 py-2 text-[12px] font-bold text-ivory-300 hover:border-gold-500 hover:text-gold-500"
          >
            <Navigation size={14} />
            الأقرب إليّ
          </button>
          <button
            type="button"
            onClick={goToOffice}
            className="inline-flex items-center gap-1.5 rounded-md border border-navy-200 bg-navy-850 px-3 py-2 text-[12px] font-bold text-ivory-300 hover:border-gold-500 hover:text-gold-500"
          >
            <MapPin size={14} />
            بالقرب من المكتب
          </button>
          <div className="flex rounded-md border border-navy-200">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 ${viewMode === 'list' ? 'bg-navy-950 text-white' : 'bg-navy-850 text-navy-400'}`}
              aria-label="عرض القائمة"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-navy-950 text-white' : 'bg-navy-850 text-navy-400'}`}
              aria-label="عرض الشبكة"
            >
              <MapIcon size={14} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-1.5 rounded-md border border-gold-500 bg-gold-500/10 px-3 py-2 text-[12px] font-bold text-gold-500 hover:bg-gold-500/20 lg:hidden"
          >
            <Filter size={14} />
            فلاتر
          </button>
        </div>
      </Card>

      {/* Filters */}
      <div className={`mb-4 ${showFilters ? 'block' : 'hidden lg:block'}`}>
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] font-extrabold text-ivory-300">
              <Filter size={14} className="text-gold-500" />
              فلاتر البحث
              <span className="text-[11px] font-bold text-navy-300">({filtered.length} من {totalCount})</span>
            </div>
            {hasFilters && (
              <button onClick={reset} className="inline-flex items-center gap-1 text-[11px] font-bold text-gold-500 hover:text-gold-500">
                <RotateCcw size={12} />
                مسح الفلاتر
              </button>
            )}
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="التصنيف">
              <option value="">كل التصنيفات</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.nameAr}</option>
              ))}
            </Select>
            <Select value={governorate} onChange={(e) => setGovernorate(e.target.value)} aria-label="المحافظة">
              <option value="">كل المحافظات</option>
              {governorates.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </Select>
            <Select value={bucket} onChange={(e) => setBucket(e.target.value)} aria-label="المسافة">
              <option value="">كل المسافات</option>
              {BUCKETS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </Select>
            <Select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="ترتيب">
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-bold text-navy-300">
                <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} className="rounded" />
                موثق فقط
              </label>
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-bold text-navy-300">
                <input type="checkbox" checked={onlineOnly} onChange={(e) => setOnlineOnly(e.target.checked)} className="rounded" />
                خدمة أونلاين
              </label>
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-bold text-navy-300">
                <input type="checkbox" checked={physicalOnly} onChange={(e) => setPhysicalOnly(e.target.checked)} className="rounded" />
                حضور شخصي
              </label>
            </div>
          </div>
          {nearby && (
            <div className="mt-3 rounded-md border border-gold-500/20 bg-gold-500/5 px-3 py-2 text-[11px] font-bold text-navy-300">
              <MapPin size={12} className="inline" /> النتائج مرتبة حسب المسافة من {nearby.lat === DOKKI_ORIGIN.lat ? 'المكتب' : 'موقعك'}
            </div>
          )}
          {geoError && <p className="mt-2 text-[11px] font-bold text-red-600">{geoError}</p>}
        </Card>
      </div>

      {/* Category quick links */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {categories.slice(0, 12).map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(category === c.id ? '' : c.id)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
              category === c.id
                ? 'bg-navy-950 text-white'
                : 'border border-navy-200 bg-navy-850 text-navy-300 hover:border-gold-500'
            }`}
          >
            {c.nameAr}
          </button>
        ))}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'لا توجد نتائج مطابقة للفلاتر.' : 'لا توجد أماكن بعد.'}
          hint="يمكنك تعديل الفلاتر أو البحث بكلمات مختلفة."
        />
      ) : viewMode === 'grid' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pageItems.map((l) => (
            <LocationCard key={l.id} row={l} nearby={nearby} viewMode="grid" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {pageItems.map((l) => (
            <LocationCard key={l.id} row={l} nearby={nearby} viewMode="list" />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-md border border-navy-200 px-3 py-1.5 text-[11px] font-bold text-navy-300 hover:border-gold-500 disabled:opacity-40"
          >
            السابق
          </button>
          <span className="text-[12px] font-bold text-navy-400">
            صفحة {currentPage} من {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="rounded-md border border-navy-200 px-3 py-1.5 text-[11px] font-bold text-navy-300 hover:border-gold-500 disabled:opacity-40"
          >
            التالي
          </button>
        </div>
      )}
    </div>
  );
}

function LocationCard({
  row,
  nearby,
  viewMode,
}: {
  row: LawyerGuideLocation;
  nearby: { lat: number; lng: number } | null;
  viewMode: 'list' | 'grid';
}) {
  const isCourt = row.type === 'COURT';
  const personalDistance = nearby && row.lat != null && row.lng != null
    ? haversineKm(nearby.lat, nearby.lng, row.lat, row.lng)
    : null;
  const directions = row.googleMapsUrl || googleDirectionsUrl(row.lat, row.lng);
  const isVerified = row.confidenceLevel === 'VERIFIED' || row.confidence === 'عالية';

  if (viewMode === 'grid') {
    return (
      <Card className="group h-full p-4 transition hover:border-gold-500 hover:shadow-md">
        <div className="flex items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isCourt ? 'bg-navy-950 text-gold-400' : 'bg-navy-800 text-ivory-200'}`}>
            {isCourt ? <Landmark size={18} /> : <Building2 size={18} />}
          </span>
          <div className="min-w-0 flex-1">
            <Link href={`/lawyer-guide/${row.slug}`} className="block">
              <p className="truncate text-[13px] font-extrabold text-ivory-50 group-hover:text-ivory-200">{row.name}</p>
            </Link>
            <p className="mt-0.5 text-[10px] font-bold text-navy-300">
              {row.category?.nameAr || LOCATION_TYPE_LABEL[row.type] || row.type}
              {row.subType ? ` — ${row.subType}` : ''}
            </p>
            {(row.city || row.governorate) && (
              <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-navy-400">
                <MapPin size={10} />
                {[row.district, row.city, row.governorate].filter(Boolean).join(' — ')}
              </p>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {isVerified && <Badge tone="gold"><ShieldCheck size={10} /> موثق</Badge>}
          {personalDistance != null && <Badge tone="gold">{personalDistance.toFixed(1)} كم</Badge>}
          {!personalDistance && row.distanceFromDokki != null && <Badge tone="outline">{row.distanceFromDokki.toFixed(1)} كم من الدقي</Badge>}
          {row.hasOnlineService && <Badge tone="gray">أونلاين</Badge>}
          {row.requiresPersonal && <Badge tone="outline">حضور شخصي</Badge>}
        </div>
        <div className="mt-3 flex gap-1.5">
          <Link href={`/lawyer-guide/${row.slug}`} className="flex-1 rounded-md bg-navy-950 px-2 py-1 text-center text-[10px] font-bold text-white hover:bg-navy-800">
            التفاصيل
          </Link>
          {directions && (
            <a href={directions} target="_blank" rel="noreferrer" className="rounded-md border border-navy-200 px-2 py-1 text-[10px] font-bold text-ivory-300 hover:border-gold-500">
              الاتجاهات
            </a>
          )}
        </div>
      </Card>
    );
  }

  // List view — row layout
  return (
    <Card className="group flex flex-col gap-3 p-3 transition hover:border-gold-500 sm:flex-row sm:items-center">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isCourt ? 'bg-navy-950 text-gold-400' : 'bg-navy-800 text-ivory-200'}`}>
        {isCourt ? <Landmark size={18} /> : <Building2 size={18} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/lawyer-guide/${row.slug}`}>
            <p className="text-[13px] font-extrabold text-ivory-50 group-hover:text-ivory-200">{row.name}</p>
          </Link>
          {isVerified && <Badge tone="gold"><ShieldCheck size={10} /> موثق</Badge>}
        </div>
        <p className="mt-0.5 text-[11px] font-bold text-navy-300">
          {row.category?.nameAr || LOCATION_TYPE_LABEL[row.type] || row.type}
          {row.subType ? ` — ${row.subType}` : ''}
          {row.governorate ? ` — ${row.governorate}` : ''}
        </p>
        {row.address && <p className="mt-0.5 truncate text-[11px] text-navy-400">{row.address}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {personalDistance != null ? (
          <span className="text-[11px] font-bold text-gold-500">{personalDistance.toFixed(1)} كم</span>
        ) : row.distanceFromDokki != null ? (
          <span className="text-[11px] font-semibold text-navy-400">{row.distanceFromDokki.toFixed(1)} كم</span>
        ) : null}
        {row.hasOnlineService && <Badge tone="gray">أونلاين</Badge>}
        {row.requiresPersonal && <Badge tone="outline">حضور شخصي</Badge>}
        <div className="flex gap-1.5">
          <Link href={`/lawyer-guide/${row.slug}`} className="rounded-md bg-navy-950 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-navy-800">
            <Eye size={11} className="inline" /> عرض
          </Link>
          {directions && (
            <a href={directions} target="_blank" rel="noreferrer" className="rounded-md border border-navy-200 px-2.5 py-1 text-[10px] font-bold text-ivory-300 hover:border-gold-500">
              الاتجاهات
            </a>
          )}
          {row.phone && (
            <a href={`tel:${row.phone}`} className="rounded-md border border-navy-200 px-2 py-1 text-[10px] font-bold text-ivory-300 hover:border-gold-500">
              <Phone size={11} />
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}
