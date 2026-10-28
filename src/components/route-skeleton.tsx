type SkeletonKind = 'sessions' | 'tasks' | 'lawyers' | 'report';

const TITLES: Record<SkeletonKind, string> = {
  sessions: 'الجلسات والمواعيد',
  tasks: 'التكليفات',
  lawyers: 'المحامون',
  report: 'تجهيز التقرير',
};

export function RouteSkeleton({ kind }: { kind: SkeletonKind }) {
  const count = kind === 'lawyers' ? 6 : kind === 'report' ? 5 : 7;
  return (
    <div dir="rtl" aria-busy="true" aria-label="تحميل الصفحة" role="status" className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-navy-100 bg-white p-4 shadow-sm">
        <div className="min-w-0 flex-1">
          <div className="h-4 w-40 animate-pulse rounded bg-navy-100" />
          <div className="mt-3 h-2.5 w-64 max-w-full animate-pulse rounded bg-navy-50" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded-full bg-ivory-100" />
      </div>
      {kind === 'lawyers' ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: count }, (_, index) => (
            <div key={index} className="rounded-2xl border border-navy-100 bg-white p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 animate-pulse rounded-full bg-ivory-100" />
                <div className="flex-1"><div className="h-3 w-2/3 animate-pulse rounded bg-navy-100" /><div className="mt-3 h-2 w-1/2 animate-pulse rounded bg-navy-50" /></div>
              </div>
              <div className="mt-5 h-2 w-full animate-pulse rounded bg-navy-50" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from({ length: count }, (_, index) => (
            <div key={index} className="rounded-2xl border border-navy-100 bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="h-7 w-7 animate-pulse rounded-lg bg-ivory-100" />
                <div className="h-3 w-36 animate-pulse rounded bg-navy-100" />
                <div className="h-3 w-24 animate-pulse rounded bg-navy-50" />
              </div>
              <div className="mt-4 h-2.5 w-full animate-pulse rounded bg-navy-50" />
              <div className="mt-2 h-2.5 w-4/5 animate-pulse rounded bg-navy-50" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
