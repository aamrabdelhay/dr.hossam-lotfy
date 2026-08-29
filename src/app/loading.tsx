export default function Loading() {
  return (
    <div className="min-h-[60vh] px-4 py-8 sm:px-6" aria-label="جارٍ التحميل" role="status">
      <div className="mx-auto w-full max-w-[1440px] animate-pulse space-y-5">
        <div className="h-20 rounded-2xl bg-navy-900/[0.05]" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-navy-900/[0.05]" />)}
        </div>
        <div className="h-64 rounded-2xl bg-navy-900/[0.05]" />
      </div>
    </div>
  );
}
