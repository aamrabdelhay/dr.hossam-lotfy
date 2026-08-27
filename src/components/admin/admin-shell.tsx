'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CalendarPlus,
  Briefcase,
  UserPlus,
  Landmark,
  Building2,
  Users,
  Activity,
  Bell,
  Pencil,
  Trash2,
  KeyRound,
  Copy,
  ImagePlus,
  CheckCheck,
  Users2,
  CalendarDays,
  FilePlus2,
} from 'lucide-react';
import {Avatar, Badge, Button, Card, EmptyState, Field, Input, Modal, Select, Tabs} from '../ui';
import { cn } from '@/lib/cn';
import { PostCard } from '../post-card';
import { TaskCreator } from './task-creator';
import { LawyerForm } from './lawyer-form';
import { LocationForm, type AdminLocationRow } from './location-form';
import { UsersTab } from './users-tab';
import { SessionEditForm } from '../session-edit-form';
import { ActivityTimeline } from '../activity-timeline';
import { StatusBadge, UrgencyBadge } from '../urgency';
import { toastSuccess, toastError } from '../toasts';
import { formatDay, formatTimeOfDay, formatDateTime } from '@/lib/dates';
import { TITLE_LABEL, LOCATION_TYPE_LABEL } from '@/lib/constants';
import type { TaskVM } from '@/lib/queries';
import type { NavLocation } from '@/lib/constants';

type LawyerRow = {
  id: string;
  slug: string;
  name: string;
  title: 'DOCTOR' | 'ADVOCATE';
  phone: string | null;
  email: string | null;
  specialization: string | null;
  bio: string | null;
  position: string | null;
  photo: string | null;
  isPrincipal: boolean;
  active: boolean;
  upcoming: number;
};

type AdminShellProps = {
  session: { userId: string; name: string; role: string };
  permissions: { manageUsers: boolean; manageLawyers: boolean; manageLocations: boolean; writeTasks: boolean };
  stats: {
    today: number;
    tomorrow: number;
    critical: number;
    important: number;
    upcoming30: number;
    uncompleted: number;
    completed: number;
    lawyers: number;
    locations: number;
    cases: number;
  };
  lawyers: LawyerRow[];
  locations: AdminLocationRow[];
  cases: Array<{ id: string; name: string; number: string }>;
  feedTasks: TaskVM[];
  activity: Array<{
    id: string;
    action: string;
    summary: string;
    createdAt: string;
  }>;
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    body: string | null;
    link: string | null;
    readAt: string | null;
    createdAt: string;
  }>;
};

export function AdminShell(props: AdminShellProps) {
  const router = useRouter();
  const sp = useSearchParams();
  const [tab, setTab] = React.useState(sp.get('tab') ?? 'overview');
  const [modal, setModal] = React.useState<null | {
    kind: 'task' | 'lawyer' | 'location' | 'editTask';
    data?: unknown;
  }>(null);

  const setTabAndSync = (t: string) => {
    setTab(t);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', t);
    router.replace(url.toString(), { scroll: false });
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6">
      {/* Admin profile header */}
      <Card className="mb-5 overflow-hidden">
        <div className="bg-navy-950 px-5 py-5 sm:px-7">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 text-gold-400 ring-1 ring-gold-500/40">
              <Users2 size={26} />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-extrabold text-ivory-50">منطقة الإدارة</h1>
              <p className="text-[12px] font-semibold text-ivory-300">
                DR. HOSSAM LOTFY LAW FIRM — تحكم كامل: الجلسات، المحامون، الأماكن، والنشاط.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <QuickAction icon={<CalendarPlus size={14} />} label="إضافة جلسة" onClick={() => setModal({ kind: 'task', data: { session: true } })} gold />
              <QuickAction icon={<FilePlus2 size={14} />} label="إضافة مهمة" onClick={() => setModal({ kind: 'task' })} />
              <QuickAction icon={<Users2 size={14} />} label="إسناد لعدة محامين" onClick={() => setModal({ kind: 'task', data: { multi: true } })} />
              <QuickAction icon={<UserPlus size={14} />} label="إضافة محامي" onClick={() => setModal({ kind: 'lawyer' })} />
              <QuickAction icon={<Landmark size={14} />} label="إضافة محكمة" onClick={() => setModal({ kind: 'location', data: { type: 'COURT' } })} />
              <QuickAction icon={<Building2 size={14} />} label="إضافة مكان" onClick={() => setModal({ kind: 'location' })} />
            </div>
          </div>
        </div>
      </Card>

      <Tabs
        active={tab}
        onChange={setTabAndSync}
        tabs={[
          { id: 'overview', label: 'نظرة عامة' },
          { id: 'tasks', label: 'الجلسات والمهام' },
          { id: 'lawyers', label: 'المحامون', count: props.stats.lawyers },
          { id: 'locations', label: 'الأماكن', count: props.stats.locations },
          { id: 'cases', label: 'القضايا', count: props.stats.cases },
          ...(props.permissions.manageUsers ? [{ id: 'users', label: 'المستخدمون' }] : []),
          { id: 'activity', label: 'النشاط' },
          { id: 'notifications', label: 'الإشعارات' },
        ]}
        className="mb-5"
      />

      {tab === 'overview' && <OverviewTab {...props} onOpenTask={() => setModal({ kind: 'task' })} />}
      {tab === 'tasks' && <TasksTab locations={props.locations} lawyers={props.lawyers} onEdit={(t) => setModal({ kind: 'editTask', data: t })} />}
      {tab === 'lawyers' && <LawyersTab lawyers={props.lawyers} onAdd={() => setModal({ kind: 'lawyer' })} onEdit={(l) => setModal({ kind: 'lawyer', data: l })} />}
      {tab === 'locations' && <LocationsTab locations={props.locations} onAdd={() => setModal({ kind: 'location' })} onEdit={(l) => setModal({ kind: 'location', data: l })} />}
      {tab === 'cases' && <CasesTab cases={props.cases} />}
      {tab === 'users' && props.permissions.manageUsers && <UsersTab currentUserId={props.session.userId} />}
      {tab === 'activity' && <ActivityTab initial={props.activity} />}
      {tab === 'notifications' && <NotificationsTab notifications={props.notifications} />}

      {/* Modals */}
      <TaskCreator
        open={modal?.kind === 'task'}
        onClose={() => setModal(null)}
        locations={props.locations}
        lawyers={props.lawyers.map((l) => ({ id: l.id, name: l.name, isPrincipal: l.isPrincipal }))}
        cases={props.cases}
      />
      <LawyerForm
        open={modal?.kind === 'lawyer'}
        onClose={() => setModal(null)}
        lawyer={
          modal?.kind === 'lawyer' && modal.data
            ? (() => {
                const l = modal.data as LawyerRow;
                return {
                  id: l.id,
                  fullName: l.name,
                  title: l.title,
                  phone: l.phone,
                  email: l.email,
                  specialization: l.specialization,
                  bio: l.bio,
                  position: l.position,
                };
              })()
            : null
        }
      />
      <LocationForm
        open={modal?.kind === 'location'}
        onClose={() => setModal(null)}
        location={modal?.kind === 'location' ? ((modal.data as AdminLocationRow) ?? null) : null}
      />
      {modal?.kind === 'editTask' && (
        <SessionEditForm
          open
          onClose={() => setModal(null)}
          task={modal.data as never}
          locations={props.locations}
          lawyers={props.lawyers.map((l) => ({ id: l.id, name: l.name }))}
        />
      )}
    </div>
  );
}

function QuickAction({ icon, label, onClick, gold }: { icon: React.ReactNode; label: string; onClick: () => void; gold?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-extrabold transition',
        gold ? 'bg-gold-500 text-navy-950 hover:bg-gold-400' : 'bg-white/10 text-ivory-100 ring-1 ring-white/15 hover:bg-white/20',
      )}
    >
      {icon}
      <span className="hidden sm:inline">+ {label}</span>
    </button>
  );
}

/* ─────────────────────────── Overview ─────────────────────────── */

function OverviewTab(props: AdminShellProps & { onOpenTask: () => void }) {
  const { stats, feedTasks, activity } = props;
  const cards = [
    { label: 'جلسات اليوم', value: stats.today, cls: 'text-red-600', href: '/calendar' },
    { label: 'جلسات غداً', value: stats.tomorrow, cls: 'text-orange-600', href: '/calendar' },
    { label: 'حرجة (3 أيام)', value: stats.critical, cls: 'text-orange-600', href: '/calendar' },
    { label: 'مهمة (14 يوم)', value: stats.important, cls: 'text-amber-600', href: '/calendar' },
    { label: 'خلال شهر', value: stats.upcoming30, cls: 'text-gold-600', href: '/calendar' },
    { label: 'مهام مفتوحة', value: stats.uncompleted, cls: 'text-navy-700', href: '#/tasks' },
    { label: 'مهام مكتملة', value: stats.completed, cls: 'text-emerald-600', href: '#/tasks' },
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {cards.map((c) =>
          c.href.startsWith('#') ? (
            <Card key={c.label} className="p-3.5">
              <p className={cn('text-2xl font-extrabold', c.cls)}>{c.value}</p>
              <p className="mt-0.5 text-[10.5px] font-bold text-navy-300">{c.label}</p>
            </Card>
          ) : (
            <Link key={c.label} href={c.href}>
              <Card className="p-3.5 transition hover:shadow-md">
                <p className={cn('text-2xl font-extrabold', c.cls)}>{c.value}</p>
                <p className="mt-0.5 text-[10.5px] font-bold text-navy-300">{c.label}</p>
              </Card>
            </Link>
          ),
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold text-navy-900">فيد الإدارة</h2>
            <Button size="sm" variant="gold" onClick={props.onOpenTask}>
              <CalendarPlus size={14} />
              + إضافة جلسة / مهمة
            </Button>
          </div>
          {feedTasks.length === 0 ? (
            <EmptyState title="لا توجد مهام بعد" hint="ابدأ بإضافة أول جلسة أو مهمة." action={<Button size="sm" onClick={props.onOpenTask}>إضافة</Button>} />
          ) : (
            feedTasks.map((t) => <PostCard key={t.id} task={t} sessionRole="admin" canWriteTasks={props.permissions.writeTasks} />)
          )}
        </div>
        <div>
          <h2 className="mb-3 text-[15px] font-extrabold text-navy-900">آخر النشاط</h2>
          <Card className="p-4">
            {activity.length === 0 ? (
              <EmptyState title="لم يتم تسجيل أي نشاط" />
            ) : (
              <div className="space-y-3">
                {activity.slice(0, 8).map((a) => (
                  <div key={a.id} className="border-s-2 border-gold-500/50 ps-3">
                    <p className="text-[12.5px] font-semibold leading-6 text-navy-800">{a.summary}</p>
                    <p className="text-[10.5px] font-semibold text-navy-300">{formatDateTime(new Date(a.createdAt))}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Tasks management ─────────────────────────── */

function TasksTab({
  locations,
  lawyers,
  onEdit,
}: {
  locations: NavLocation[];
  lawyers: LawyerRow[];
  onEdit: (t: TaskVM) => void;
}) {
  const router = useRouter();
  const [items, setItems] = React.useState<TaskVM[]>([]);
  const [total, setTotal] = React.useState(0);
  const [offset, setOffset] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [lawyerId, setLawyerId] = React.useState('');
  const [locationId, setLocationId] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [confirmDelete, setConfirmDelete] = React.useState<TaskVM | null>(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(
    async (off: number) => {
      setLoading(true);
      const params = new URLSearchParams({ offset: String(off), limit: '25' });
      if (lawyerId) params.set('lawyerId', lawyerId);
      if (locationId) params.set('locationId', locationId);
      if (status) params.set('status', status);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await fetch(`/api/tasks?${params}`);
      if (res.ok) {
        const d = await res.json();
        setItems((prev) => (off === 0 ? d.items : [...prev, ...d.items]));
        setTotal(d.total);
        setOffset(d.items.length);
      }
      setLoading(false);
    },
    [lawyerId, locationId, status, from, to],
  );

  React.useEffect(() => {
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lawyerId, locationId, status, from, to]);

  const remove = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    const res = await fetch(`/api/tasks/${confirmDelete.id}`, { method: 'DELETE' });
    setBusy(false);
    if (res.ok) {
      toastSuccess('تم حذف المهمة.');
      setConfirmDelete(null);
      load(0);
      router.refresh();
    } else {
      toastError('تعذر الحذف.');
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="المحامي">
            <Select value={lawyerId} onChange={(e) => setLawyerId(e.target.value)}>
              <option value="">الكل</option>
              {lawyers.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="المكان">
            <Select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">الكل</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="الحالة">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">الكل</option>
              <option value="PENDING">قيد الجدولة</option>
              <option value="IN_PROGRESS">جاري التنفيذ</option>
              <option value="COMPLETED">تم التنفيذ</option>
              <option value="CANCELLED">ملغي</option>
            </Select>
          </Field>
          <Field label="من تاريخ">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="إلى تاريخ">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
        <p className="mt-2 text-[11px] font-bold text-navy-300">{total} مهمة</p>
      </Card>

      {loading && items.length === 0 ? (
        <EmptyState title="جارٍ التحميل…" />
      ) : items.length === 0 ? (
        <EmptyState title="لا توجد مهام مطابقة" hint="جرّب تغيير الفلاتر." />
      ) : (
        <Card className="divide-y divide-navy-100 overflow-hidden">
          {items.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-ivory-50/60">
              <div className="w-28 shrink-0">
                {t.scheduledDate ? (
                  <>
                    <p className="text-[12px] font-extrabold text-navy-800">{formatDay(new Date(`${t.scheduledDate}T12:00:00`))}</p>
                    <p className="font-latin text-[11px] font-bold text-navy-400">{t.scheduledTime ? `${t.scheduledTime}` : ''}</p>
                  </>
                ) : (
                  <span className="text-[11px] font-bold text-navy-300">بلا تاريخ</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/sessions/${t.id}`} className="line-clamp-1 text-[13px] font-bold text-navy-900 hover:underline">{t.description}</Link>
                <p className="mt-0.5 text-[11px] font-semibold text-navy-400">
                  {t.location.name}
                  {t.lawyers.map((l) => (
                    <span key={l.id} className={cn('ms-2', l.completed ? 'text-emerald-600' : 'text-navy-400')}>
                      {l.completed ? '✓ ' : ''}{l.name}
                    </span>
                  ))}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={t.status} />
                {t.scheduledDate && t.status !== 'COMPLETED' && <UrgencyBadge urgency={t.urgency} />}
                <button onClick={() => onEdit(t)} className="rounded-md p-2 text-navy-400 hover:bg-navy-900/5 hover:text-navy-800" title="تعديل">
                  <Pencil size={14} />
                </button>
                <button onClick={() => setConfirmDelete(t)} className="rounded-md p-2 text-navy-300 hover:bg-red-600/10 hover:text-red-600" title="حذف">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {items.length < total && (
            <div className="flex justify-center p-3">
              <Button variant="outline" size="sm" onClick={() => load(offset)} disabled={loading}>
                {loading ? 'جارٍ التحميل…' : 'عرض المزيد'}
              </Button>
            </div>
          )}
        </Card>
      )}

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="تأكيد الحذف"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>إلغاء</Button>
            <Button variant="danger" onClick={remove} disabled={busy}>حذف نهائي</Button>
          </div>
        }
      >
        <p className="text-sm leading-7 text-navy-700">سيتم حذف المهمة وجميع تعليقاتها نهائياً. لا يمكن التراجع.</p>
      </Modal>
    </div>
  );
}

/* ─────────────────────────── Lawyers management ─────────────────────────── */

function LawyersTab({ lawyers, onAdd, onEdit }: { lawyers: LawyerRow[]; onAdd: () => void; onEdit: (l: LawyerRow) => void }) {
  const router = useRouter();
  const [linkFor, setLinkFor] = React.useState<LawyerRow | null>(null);
  const [link, setLink] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const photoTargetRef = React.useRef<LawyerRow | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const genLink = async (l: LawyerRow) => {
    setLinkFor(l);
    setLink(null);
    setBusy(true);
    const res = await fetch(`/api/lawyers/${l.id}/access-token`, { method: 'POST' });
    setBusy(false);
    if (res.ok) {
      const d = await res.json();
      setLink(d.url);
    } else {
      toastError('تعذر توليد الرابط.');
    }
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toastSuccess('تم نسخ الرابط ✓');
    } catch {
      toastError('تعذر النسخ — انسخ الرابط يدوياً.');
    }
  };

  const pickPhoto = (l: LawyerRow) => {
    photoTargetRef.current = l;
    fileRef.current?.click();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const target = photoTargetRef.current;
    if (!file || !target) return;
    const form = new FormData();
    form.append('file', file);
    setBusy(true);
    const up = await fetch('/api/upload', { method: 'POST', body: form });
    if (!up.ok) {
      const d = await up.json().catch(() => ({}));
      toastError(d.error ?? 'تعذر رفع الصورة.');
      setBusy(false);
      return;
    }
    const d = await up.json();
    const res = await fetch(`/api/lawyers/${target.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profilePhotoUrl: d.url }),
    });
    setBusy(false);
    if (res.ok) {
      toastSuccess(`تم تحديث صورة ${target.name} ✓`);
      router.refresh();
    } else {
      toastError('تعذر حفظ الصورة.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-bold text-navy-500">{lawyers.length} محامي</p>
        <Button size="sm" onClick={onAdd}>
          <UserPlus size={14} />
          + إضافة محامي
        </Button>
      </div>
      <Card className="divide-y divide-navy-100">
        {lawyers.map((l) => (
          <div key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <Avatar name={l.name} src={l.photo} size={42} ring={l.isPrincipal} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/lawyers/${l.slug}`} className="text-[13.5px] font-extrabold text-navy-950 hover:underline">{l.name}</Link>
                <Badge tone={l.isPrincipal ? 'gold' : 'gray'}>{TITLE_LABEL[l.title]}</Badge>
                {!l.active && <Badge tone="red">مخفي</Badge>}
              </div>
              <p className="mt-0.5 text-[11px] font-semibold text-navy-400">
                {l.phone && <span className="font-latin" dir="ltr">{l.phone}</span>}
                {l.specialization && ` • ${l.specialization}`}
                {` • ${l.upcoming} مهمة قادمة`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button onClick={() => pickPhoto(l)} className="rounded-md p-2 text-navy-400 hover:bg-navy-900/5 hover:text-navy-800" title="رفع صورة">
                <ImagePlus size={15} />
              </button>
              <button onClick={() => onEdit(l)} className="rounded-md p-2 text-navy-400 hover:bg-navy-900/5 hover:text-navy-800" title="تعديل">
                <Pencil size={14} />
              </button>
              <button onClick={() => genLink(l)} className="flex items-center gap-1 rounded-md border border-gold-500/40 bg-gold-500/10 px-2.5 py-1.5 text-[11px] font-extrabold text-gold-700 hover:bg-gold-500/20" title="رابط دخول المحامي">
                <KeyRound size={12} />
                رابط الدخول
              </button>
            </div>
          </div>
        ))}
      </Card>

      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onFile} />

      <Modal open={!!linkFor} onClose={() => setLinkFor(null)} title={`رابط دخول: ${linkFor?.name ?? ''}`}>
        <div className="space-y-3">
          <p className="text-[12.5px] leading-6 text-navy-600">
            أرسل هذا الرابط للمحامي — سيفتح جلوساً آمناً خاصاً به (لن يحتاج كلمة مرور). أي رابط قديم سيصبح منتهياً فور توليد رابط جديد.
          </p>
          {busy ? (
            <p className="text-[12px] font-bold text-navy-400">جارٍ التوليد…</p>
          ) : link ? (
            <div className="space-y-2">
              <Input readOnly value={link} dir="ltr" className="font-latin text-[12px]" />
              <div className="flex gap-2">
                <Button size="sm" variant="gold" onClick={copy}>
                  <Copy size={13} />
                  نسخ
                </Button>
                <a href={link} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline">فتح</Button>
                </a>
              </div>
            </div>
          ) : (
            <Button size="sm" onClick={() => linkFor && genLink(linkFor)}>توليد رابط جديد</Button>
          )}
        </div>
      </Modal>
    </div>
  );
}

/* ─────────────────────────── Locations management ─────────────────────────── */

function LocationsTab({ locations, onAdd, onEdit }: { locations: AdminLocationRow[]; onAdd: () => void; onEdit: (l: AdminLocationRow) => void }) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = React.useState<NavLocation | null>(null);
  const [busy, setBusy] = React.useState(false);

  const remove = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    const res = await fetch(`/api/locations/${confirmDelete.id}`, { method: 'DELETE' });
    setBusy(false);
    if (res.ok) {
      toastSuccess('تم حذف المكان.');
      setConfirmDelete(null);
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      toastError(d.error ?? 'تعذر الحذف — قد يحتوي على مهام.');
      setConfirmDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-bold text-navy-500">{locations.length} مكان — كل مكان له صفحة مستقلة</p>
        <Button size="sm" onClick={onAdd}>
          <Building2 size={14} />
          + إضافة مكان
        </Button>
      </div>
      <Card className="divide-y divide-navy-100">
        {locations.map((l) => (
          <div key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-950 text-gold-400">
              {l.type === 'COURT' ? <Landmark size={16} /> : <Building2 size={16} />}
            </span>
            <div className="min-w-0 flex-1">
              <Link href={`/locations/${l.slug}`} className="text-[13.5px] font-extrabold text-navy-950 hover:underline">{l.name}</Link>
              <p className="text-[11px] font-semibold text-navy-400">
                {LOCATION_TYPE_LABEL[l.type] ?? l.type}
                {l.governorate ? ` — ${l.governorate}` : ''}
                {l.city ? ` / ${l.city}` : ''}
              </p>
            </div>
            <button onClick={() => onEdit(l)} className="rounded-md p-2 text-navy-400 hover:bg-navy-900/5 hover:text-navy-800" title="تعديل">
              <Pencil size={14} />
            </button>
            <button onClick={() => setConfirmDelete(l)} className="rounded-md p-2 text-navy-300 hover:bg-red-600/10 hover:text-red-600" title="حذف">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </Card>
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="تأكيد الحذف"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>إلغاء</Button>
            <Button variant="danger" onClick={remove} disabled={busy}>حذف</Button>
          </div>
        }
      >
        <p className="text-sm leading-7 text-navy-700">لا يمكن حذف مكان عليه مهام أو جلسات — سيتم رفض الحذف حفاظاً على السجل.</p>
      </Modal>
    </div>
  );
}

/* ─────────────────────────── Activity ─────────────────────────── */

function CasesTab({ cases }: { cases: Array<{ id: string; name: string; number: string }> }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-100 bg-ivory-50 px-5 py-4">
        <div>
          <h2 className="text-base font-extrabold text-navy-950">ملفات القضايا</h2>
          <p className="mt-1 text-[11px] font-semibold text-navy-400">القضية هي المحور الذي يجمع الجلسات والمهام داخل المكتب.</p>
        </div>
        <span className="rounded-full bg-gold-500/15 px-3 py-1 text-[11px] font-extrabold text-gold-700">{cases.length} قضية مسجلة</span>
      </div>
      {cases.length === 0 ? <EmptyState title="لا توجد قضايا بعد" hint="أضف قضية من نموذج الجلسة لتظهر هنا." /> : (
        <div className="divide-y divide-navy-100">
          {cases.map((item, index) => (
            <div key={item.id} className="flex items-center gap-3 px-5 py-4 hover:bg-ivory-50">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-950 text-xs font-extrabold text-gold-300">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-navy-900">{item.name}</p>
                <p className="mt-0.5 truncate font-latin text-[11px] font-semibold text-navy-400" dir="ltr">{item.number}</p>
              </div>
              <Link href={`/search?q=${encodeURIComponent(item.number)}&type=session`} className="rounded-md px-2.5 py-1.5 text-[11px] font-bold text-gold-700 hover:bg-gold-500/10">عرض المرتبط</Link>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function ActivityTab({ initial }: { initial: Array<{ id: string; action: string; summary: string; createdAt: string }> }) {
  const [items, setItems] = React.useState<
    Array<{ id: string; action: string; summary: string; createdAt: string; lawyer: { fullName: string; slug: string } | null }>
  >([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('/api/activity')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setItems(d.activity))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <EmptyState title="جارٍ التحميل…" />;
  if (items.length === 0) return <EmptyState title="لم يتم تسجيل أي نشاط" hint="كل إنشاء وتعديل وإسناد وتنفيذ وتعليق وحذف يسجل هنا." />;

  return (
    <Card className="p-5">
      <ol className="relative space-y-4 border-s-2 border-navy-100 ps-5">
        {items.map((a) => (
          <li key={a.id} className="relative">
            <span className="absolute -start-[27px] top-1.5 h-3 w-3 rounded-full bg-gold-500 ring-4 ring-white" />
            <div className="flex flex-wrap items-baseline gap-x-2">
              <p className="text-[13px] font-semibold leading-6 text-navy-800">{a.summary}</p>
            </div>
            <p className="mt-0.5 text-[11px] font-semibold text-navy-300">
              {formatDateTime(new Date(a.createdAt))}
              {a.lawyer && (
                <>
                  {' — '}
                  <Link href={`/lawyers/${a.lawyer.slug}`} className="text-gold-700 hover:underline">{a.lawyer.fullName}</Link>
                </>
              )}
            </p>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/* ─────────────────────────── Notifications ─────────────────────────── */

function NotificationsTab({ notifications }: { notifications: AdminShellProps['notifications'] }) {
  const [items, setItems] = React.useState(notifications);
  const [loading, setLoading] = React.useState(false);

  const markAll = async () => {
    setLoading(true);
    const res = await fetch('/api/notifications', { method: 'POST' });
    if (res.ok) {
      const d = await res.json();
      setItems(d.notifications ?? items);
    }
    setLoading(false);
  };

  const TYPE_LABEL: Record<string, string> = {
    TASK_ASSIGNED: 'مهمة جديدة',
    TASK_EDITED: 'تعديل',
    SESSION_CRITICAL: 'جلسة حرجة',
    SESSION_TOMORROW: 'جلسة غداً',
    COMMENT: 'تعليق',
    TASK_COMPLETED: 'تنفيذ',
    TASK_DELETED: 'حذف',
    ANNOUNCEMENT: 'إعلان',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-bold text-navy-500">إشعارات الإدارة</p>
        <Button size="sm" variant="outline" onClick={markAll} disabled={loading}>
          <CheckCheck size={14} />
          تحديد الكل كمقروء
        </Button>
      </div>
      <Card className="divide-y divide-navy-100">
        {items.length === 0 ? (
          <div className="p-6">
            <EmptyState title="لا توجد إشعارات" />
          </div>
        ) : (
          items.map((n) => (
            <div key={n.id} className={cn('flex items-start gap-3 px-4 py-3', !n.readAt && 'bg-gold-500/[0.05]')}>
              <span className={cn('mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', !n.readAt ? 'bg-gold-500/20 text-gold-700' : 'bg-navy-900/5 text-navy-400')}>
                <Bell size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={cn('text-[13px] font-extrabold', n.readAt ? 'text-navy-600' : 'text-navy-950')}>{n.title}</p>
                  <Badge tone="outline">{TYPE_LABEL[n.type] ?? n.type}</Badge>
                  {!n.readAt && <span className="h-2 w-2 rounded-full bg-gold-500" />}
                </div>
                {n.body && <p className="mt-0.5 text-[12px] font-semibold leading-6 text-navy-500">{n.body}</p>}
                <p className="mt-0.5 text-[10.5px] font-semibold text-navy-300">{formatDateTime(new Date(n.createdAt))}</p>
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
