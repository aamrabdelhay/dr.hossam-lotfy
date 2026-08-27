import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Landmark, Building2, MapPin, Phone, Mail, Globe, ExternalLink,
  Navigation, ShieldCheck, Clock3, ArrowRight, Calendar,
  CheckCircle2, AlertCircle, Clock, FileText, ChevronLeft,
} from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { Badge, Card } from '@/components/ui';
import { LOCATION_TYPE_LABEL } from '@/lib/constants';
import { googleDirectionsUrl, DOKKI_ORIGIN } from '@/lib/legal-directory';
import { categoryForType } from '@/lib/legal-directory';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const location = await prisma.location.findUnique({ where: { slug } });
  if (!location) return { title: 'غير موجود' };
  return {
    title: `${location.name} — دليل المحامي في مصر`,
    description: location.address || location.description || `${location.name} — ${LOCATION_TYPE_LABEL[location.type] || location.type}`,
  };
}

const DAY_LABELS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const RELATIONSHIP_LABELS: Record<string, string> = {
  LOCATED_IN: 'يقع داخل',
  PART_OF: 'جزء من',
  SUBORDINATE_TO: 'تابع لـ',
  JURISDICTION_OF: 'يختص بـ',
  SERVES: 'يخدم',
  REFERS_TO: 'يُحيل إلى',
  ASSOCIATED_WITH: 'مرتبط بـ',
  SAME_BUILDING: 'في نفس المبنى',
  MOVED_FROM: 'انتقل من',
  MOVED_TO: 'انتقل إلى',
};

export default async function LawyerGuideDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const location = await prisma.location.findUnique({
    where: { slug },
    include: {
      category: { select: { id: true, nameAr: true, nameEn: true, slug: true } },
      organization: { select: { id: true, nameAr: true, nameEn: true } },
      locationServices: {
        include: { service: { select: { id: true, nameAr: true, nameEn: true, slug: true, onlineAvailable: true, description: true } } },
      },
      locationJurisdictions: {
        include: { jurisdiction: true },
      },
      relationshipsFrom: {
        where: { verified: true },
        include: {
          toLocation: { select: { id: true, slug: true, name: true, type: true, governorate: true, district: true, address: true } },
        },
      },
      relationshipsTo: {
        where: { verified: true },
        include: {
          fromLocation: { select: { id: true, slug: true, name: true, type: true, governorate: true, district: true, address: true } },
        },
      },
      locationSources: {
        include: { source: { select: { id: true, name: true, url: true, type: true } } },
      },
      verificationRecords: {
        orderBy: { verifiedAt: 'desc' },
        take: 5,
      },
      openingHours: {
        orderBy: { dayOfWeek: 'asc' },
      },
      changeHistory: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!location) notFound();

  const isVerified = location.confidenceLevel === 'VERIFIED' || location.confidence === 'عالية';
  const isArchived = location.verificationStatus === 'ARCHIVED';
  const directions = location.googleMapsUrl || googleDirectionsUrl(location.lat, location.lng);

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-2 text-[12px] text-navy-400">
        <Link href="/lawyer-guide" className="hover:text-gold-500">دليل المحامي</Link>
        <ChevronLeft size={12} />
        <span className="text-ivory-300">{location.name}</span>
      </nav>

      {/* Header Card */}
      <Card className="overflow-hidden">
        <div className={`relative px-5 py-7 sm:px-8 ${location.type === 'COURT' ? 'bg-navy-950' : 'bg-navy-900'}`}>
          <div className="gold-hairline absolute inset-x-0 bottom-0" />
          <div className="flex flex-wrap items-start gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/10 text-gold-400 ring-1 ring-gold-500/40">
              {location.type === 'COURT' ? <Landmark size={30} /> : <Building2 size={30} />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-extrabold text-ivory-50 sm:text-2xl">{location.name}</h1>
                {isVerified && <Badge tone="gold"><ShieldCheck size={11} /> موثق</Badge>}
                {isArchived && <Badge tone="amber">مؤرشف</Badge>}
              </div>
              {location.nameEn && <p className="mt-1 text-[12px] font-medium text-ivory-300">{location.nameEn}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone="gold">{location.category?.nameAr || categoryForType(location.type, location.name, location.subType ?? '')}</Badge>
                {location.subType && <span className="text-[11px] text-ivory-300">{location.subType}</span>}
              </div>
              {location.address && (
                <p className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-ivory-300">
                  <MapPin size={12} className="text-gold-400" />
                  {location.address}
                  {location.city || location.governorate ? ` — ${[location.city, location.governorate].filter(Boolean).join('، ')}` : ''}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              {location.distanceFromDokki != null && (
                <div className="text-center">
                  <p className="text-xl font-extrabold text-gold-300">{location.distanceFromDokki.toFixed(1)}</p>
                  <p className="text-[10px] font-bold text-ivory-300">كم من الدقي</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content Grid */}
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {/* Left column — 2/3 */}
        <div className="lg:col-span-2 space-y-5">
          {/* Overview */}
          {location.description && (
            <Card className="p-5">
              <h2 className="mb-3 text-[14px] font-extrabold text-ivory-100">نظرة عامة</h2>
              <p className="text-[13px] leading-7 text-navy-300">{location.description}</p>
            </Card>
          )}

          {/* Services */}
          {location.locationServices.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-3 text-[14px] font-extrabold text-ivory-100">الخدمات المتاحة</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {location.locationServices.map((ls) => (
                  <div key={ls.service.id} className="flex items-center gap-2 rounded-md border border-navy-100 px-3 py-2">
                    <CheckCircle2 size={14} className="shrink-0 text-gold-500" />
                    <div>
                      <p className="text-[12px] font-bold text-ivory-200">{ls.service.nameAr}</p>
                      {ls.service.onlineAvailable && (
                        <p className="text-[10px] font-semibold text-green-600">متاح أونلاين</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Legacy services array */}
          {location.services.length > 0 && location.locationServices.length === 0 && (
            <Card className="p-5">
              <h2 className="mb-3 text-[14px] font-extrabold text-ivory-100">الخدمات</h2>
              <div className="flex flex-wrap gap-2">
                {location.services.map((s) => (
                  <Badge key={s} tone="outline">{s}</Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Jurisdiction */}
          {(location.jurisdiction || location.locationJurisdictions.length > 0) && (
            <Card className="p-5">
              <h2 className="mb-3 text-[14px] font-extrabold text-ivory-100">الاختصاص</h2>
              {location.jurisdiction && (
                <p className="text-[13px] font-semibold text-ivory-300">{location.jurisdiction}</p>
              )}
              {location.locationJurisdictions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {location.locationJurisdictions.map((lj) => (
                    <Badge key={lj.jurisdiction.id} tone="outline">{lj.jurisdiction.nameAr}</Badge>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Related Authorities */}
          {location.relationshipsFrom.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-3 text-[14px] font-extrabold text-ivory-100">الجهات المرتبطة</h2>
              <div className="space-y-2">
                {location.relationshipsFrom.map((rel) => (
                  <Link
                    key={rel.id}
                    href={`/lawyer-guide/${rel.toLocation.slug}`}
                    className="flex items-center gap-2 rounded-md border border-navy-100 px-3 py-2 transition hover:border-gold-500"
                  >
                    <ArrowRight size={12} className="text-gold-500" />
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold text-ivory-200">{rel.toLocation.name}</p>
                      <p className="text-[10px] text-navy-400">{RELATIONSHIP_LABELS[rel.type] || rel.type}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {/* Sources & Verification */}
          <Card className="p-5">
            <h2 className="mb-3 text-[14px] font-extrabold text-ivory-100">المصادر والتحقق</h2>
            <div className="space-y-3 text-[12px]">
              {location.lastVerified && (
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-gold-500" />
                  <span className="font-bold text-navy-300">آخر تحقق: {new Date(location.lastVerified).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-gold-500" />
                <span className="font-bold text-navy-300">مستوى الثقة: {location.confidence || location.confidenceLevel}</span>
              </div>
              {location.source && (
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-navy-300" />
                  <span className="font-semibold text-navy-400">المصدر: {location.source}</span>
                </div>
              )}
              {location.locationSources.length > 0 && (
                <div className="mt-2 space-y-1">
                  {location.locationSources.map((ls) => (
                    <div key={ls.id} className="flex items-center gap-2">
                      <Globe size={12} className="text-navy-300" />
                      {ls.source.url ? (
                        <a href={ls.source.url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-gold-500 hover:underline">
                          {ls.source.name}
                        </a>
                      ) : (
                        <span className="text-[11px] font-semibold text-navy-400">{ls.source.name}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {(location.verificationStatus === 'NEEDS_REVIEW' || location.confidenceLevel === 'NEEDS_VERIFICATION') && (
                <div className="mt-2 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                  <AlertCircle size={14} className="text-amber-600" />
                  <span className="text-[11px] font-bold text-amber-700">بيانات هذا القسم قيد التحقق</span>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right column — 1/3 */}
        <div className="space-y-5">
          {/* Contact */}
          <Card className="p-5">
            <h2 className="mb-3 text-[13px] font-extrabold text-ivory-100">بيانات التواصل</h2>
            <div className="space-y-2.5 text-[12px]">
              {location.phone && (
                <a href={`tel:${location.phone}`} className="flex items-center gap-2 font-bold text-ivory-300 hover:text-gold-500">
                  <Phone size={13} className="text-gold-500" />
                  <span className="ltr">{location.phone}</span>
                </a>
              )}
              {location.email && (
                <a href={`mailto:${location.email}`} className="flex items-center gap-2 font-bold text-ivory-300 hover:text-gold-500">
                  <Mail size={13} className="text-gold-500" />
                  <span className="ltr">{location.email}</span>
                </a>
              )}
              {location.officialUrl && (
                <a href={location.officialUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-bold text-ivory-300 hover:text-gold-500">
                  <Globe size={13} className="text-gold-500" />
                  الموقع الرسمي
                </a>
              )}
              {location.googleMapsUrl && (
                <a href={location.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-bold text-ivory-300 hover:text-gold-500">
                  <MapPin size={13} className="text-gold-500" />
                  خرائط جوجل
                </a>
              )}
            </div>
          </Card>

          {/* Opening Hours */}
          {(location.openingHours.length > 0 || location.workingHours) && (
            <Card className="p-5">
              <h2 className="mb-3 flex items-center gap-2 text-[13px] font-extrabold text-ivory-100">
                <Clock3 size={14} className="text-gold-500" />
                مواعيد العمل
              </h2>
              {location.workingHours && (
                <p className="text-[12px] font-semibold text-ivory-300">{location.workingHours}</p>
              )}
              {location.openingHours.length > 0 && (
                <div className="mt-2 space-y-1">
                  {location.openingHours.map((oh) => (
                    <div key={oh.id} className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-navy-300">{DAY_LABELS[oh.dayOfWeek]}</span>
                      {oh.closed ? (
                        <span className="font-semibold text-red-500">مغلق</span>
                      ) : (
                        <span className="font-semibold text-navy-400">{oh.opens} — {oh.closes}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Action buttons */}
          <Card className="p-5">
            <div className="space-y-2">
              {directions && (
                <a
                  href={directions}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-navy-950 px-4 py-2.5 text-[12px] font-bold text-white hover:bg-navy-800"
                >
                  <Navigation size={14} />
                  الاتجاهات من الدقي
                </a>
              )}
              {location.phone && (
                <a
                  href={`tel:${location.phone}`}
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-navy-200 px-4 py-2.5 text-[12px] font-bold text-ivory-300 hover:border-gold-500"
                >
                  <Phone size={14} />
                  اتصال
                </a>
              )}
              {location.hasOnlineService && (
                <div className="flex items-center justify-center gap-2 rounded-md border border-green-200 bg-green-50 px-4 py-2.5 text-[12px] font-bold text-green-700">
                  <Globe size={14} />
                  خدمة إلكترونية متاحة
                </div>
              )}
              {location.requiresPersonal && (
                <div className="flex items-center justify-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-[12px] font-bold text-amber-700">
                  <AlertCircle size={14} />
                  الحضور الشخصي مطلوب
                </div>
              )}
            </div>
          </Card>

          {/* Map placeholder */}
          {location.lat != null && location.lng != null && (
            <Card className="overflow-hidden p-0">
              <div className="relative h-48 bg-white/[0.06]">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin size={24} className="mx-auto text-gold-500" />
                    <p className="mt-2 text-[11px] font-bold text-navy-400">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</p>
                    {location.googleMapsUrl && (
                      <a href={location.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[11px] font-bold text-gold-500 hover:underline">
                        فتح في خرائط جوجل →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
