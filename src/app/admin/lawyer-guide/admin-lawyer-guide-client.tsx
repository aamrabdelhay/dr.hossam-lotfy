'use client';

import * as React from 'react';
import { Card, Badge, Input, Select, EmptyState } from '@/components/ui';
import { Search, Plus, Edit2, Archive, ShieldCheck, AlertCircle, Filter, RotateCcw, Eye } from 'lucide-react';
import Link from 'next/link';

type Category = { id: string; nameAr: string; nameEn: string; slug: string };
type AdminLocation = {
  id: string;
  slug: string;
  name: string;
  nameEn: string | null;
  type: string;
  subType: string | null;
  governorate: string | null;
  city: string | null;
  district: string | null;
  confidence: string | null;
  confidenceLevel: string;
  verificationStatus: string;
  lastVerified: string | null;
  categoryId: string | null;
  categoryName: string | null;
};

const STATUS_LABELS: Record<string, { label: string; tone: 'gold' | 'gray' | 'green' | 'amber' | 'outline' }> = {
  DRAFT: { label: 'مسودة', tone: 'gray' },
  PENDING: { label: 'قيد المراجعة', tone: 'amber' },
  VERIFIED: { label: 'موثق', tone: 'green' },
  NEEDS_REVIEW: { label: 'يحتاج مراجعة', tone: 'amber' },
  ARCHIVED: { label: 'مؤرشف', tone: 'outline' },
};

export function AdminLawyerGuideClient({
  session,
  categories,
  locations,
  verificationPending,
}: {
  session: { userId: string; name: string; role: string };
  categories: Category[];
  locations: AdminLocation[];
  verificationPending: number;
}) {
  const [q, setQ] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('');

  const filtered = locations.filter((l) => {
    if (q) {
      const needle = q.toLowerCase();
      const hay = [l.name, l.nameEn, l.governorate, l.city, l.district, l.categoryName].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    if (statusFilter && l.verificationStatus !== statusFilter) return false;
    if (categoryFilter && l.categoryId !== categoryFilter) return false;
    return true;
  });

  const archiveLocation = async (id: string) => {
    if (!confirm('هل أنت متأكد من أرشفة هذا المكان؟')) return;
    await fetch(`/api/lawyer-guide/locations/${id}`, { method: 'DELETE' });
    window.location.reload();
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-navy-950">إدارة دليل المحامي</h1>
          <p className="mt-1 text-[12px] text-navy-400">
            {locations.length} مكان · {verificationPending} بحاجة للمراجعة
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded-md border border-navy-200 px-3 py-1.5 text-[11px] font-bold text-navy-600 hover:border-gold-500"
        >
          ← العودة للإدارة
        </Link>
      </div>

      {/* Filters */}
      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-navy-300" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="بحث بالاسم أو المحافظة..."
              className="ps-9"
            />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">كل الحالات</option>
            <option value="DRAFT">مسودة</option>
            <option value="PENDING">قيد المراجعة</option>
            <option value="VERIFIED">موثق</option>
            <option value="NEEDS_REVIEW">يحتاج مراجعة</option>
            <option value="ARCHIVED">مؤرشف</option>
          </Select>
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">كل التصنيفات</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.nameAr}</option>
            ))}
          </Select>
          {(q || statusFilter || categoryFilter) && (
            <button
              onClick={() => { setQ(''); setStatusFilter(''); setCategoryFilter(''); }}
              className="text-[11px] font-bold text-gold-700 hover:text-gold-600"
            >
              <RotateCcw size={12} className="inline" /> مسح
            </button>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-navy-100 bg-navy-50">
                <th className="px-3 py-2.5 text-start font-bold text-navy-600">الاسم</th>
                <th className="px-3 py-2.5 text-start font-bold text-navy-600">التصنيف</th>
                <th className="px-3 py-2.5 text-start font-bold text-navy-600">المحافظة</th>
                <th className="px-3 py-2.5 text-start font-bold text-navy-600">الحالة</th>
                <th className="px-3 py-2.5 text-start font-bold text-navy-600">الثقة</th>
                <th className="px-3 py-2.5 text-start font-bold text-navy-600">آخر تحقق</th>
                <th className="px-3 py-2.5 text-end font-bold text-navy-600">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8">
                    <EmptyState title="لا توجد نتائج" hint="يمكنك تعديل الفلاتر أو البحث بكلمات مختلفة." />
                  </td>
                </tr>
              ) : (
                filtered.map((l) => {
                  const statusInfo = STATUS_LABELS[l.verificationStatus] || { label: l.verificationStatus, tone: 'gray' as const };
                  return (
                    <tr key={l.id} className="border-b border-navy-50 hover:bg-ivory-50">
                      <td className="px-3 py-2">
                        <Link href={`/lawyer-guide/${l.slug}`} className="font-bold text-navy-800 hover:text-gold-700">
                          {l.name}
                        </Link>
                        {l.subType && <p className="text-[10px] text-navy-400">{l.subType}</p>}
                      </td>
                      <td className="px-3 py-2 font-semibold text-navy-600">{l.categoryName || '—'}</td>
                      <td className="px-3 py-2 text-navy-500">{l.governorate || '—'}</td>
                      <td className="px-3 py-2">
                        <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-[11px] font-semibold text-navy-500">{l.confidenceLevel}</span>
                      </td>
                      <td className="px-3 py-2 text-[11px] text-navy-400">
                        {l.lastVerified ? new Date(l.lastVerified).toLocaleDateString('ar-EG') : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/lawyer-guide/${l.slug}`}
                            className="rounded p-1.5 text-navy-400 hover:bg-navy-50 hover:text-gold-700"
                            title="عرض"
                          >
                            <Eye size={13} />
                          </Link>
                          <button
                            onClick={() => archiveLocation(l.id)}
                            className="rounded p-1.5 text-navy-400 hover:bg-red-50 hover:text-red-600"
                            title="أرشفة"
                          >
                            <Archive size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Verification queue */}
      {verificationPending > 0 && (
        <Card className="mt-5 border-amber-200 p-5">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-600" />
            <h3 className="text-[13px] font-extrabold text-amber-700">
              {verificationPending} مكان بحاجة للمراجعة والتحقق
            </h3>
          </div>
          <p className="mt-1 text-[12px] text-amber-600">
            راجع الأماكن المسجلة كمسودة أو قيد المراجعة وتأكد من صحة البيانات قبل التوثيق.
          </p>
        </Card>
      )}
    </div>
  );
}
