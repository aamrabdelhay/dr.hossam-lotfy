import { redirect } from "next/navigation";
import Link from "next/link";
import { Clock3, CalendarDays, ArrowUpLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { isFinanceManagement } from "@/lib/office-workflow";
import { TimesheetWorkspace } from "@/components/timesheet-workspace";

export const dynamic = "force-dynamic";
export const metadata = { title: "ساعات العمل" };

function cairoDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function TimesheetsPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/auth?next=/timesheets");
  const canReview = await isFinanceManagement(session);

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold tracking-widest text-gold-700">WORK LOG</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold text-navy-950">
            <Clock3 size={23} className="text-gold-700" /> ساعات العمل
          </h1>
          <p className="mt-1 text-sm font-semibold text-navy-500">تسجيل الوقت الفعلي وربطه بالقضية ومراجعته قبل اعتماده</p>
        </div>
        <Link href="/my-day" className="inline-flex items-center gap-2 rounded-xl border border-navy-200 bg-white px-4 py-2.5 text-xs font-extrabold text-navy-700">
          يومي <ArrowUpLeft size={14} />
        </Link>
      </header>
      <div className="mb-5 flex items-center gap-2 rounded-2xl border border-gold-200 bg-white p-4 text-xs font-semibold text-navy-600">
        <CalendarDays size={17} className="shrink-0 text-gold-700" />
        أدخل الوقت الذي قضيته في العمل، ثم أرسله للمراجعة. لا تُحتسب الساعات ضمن التقارير المعتمدة إلا بعد موافقة الإدارة المالية أو الإدارة العليا.
      </div>
      <TimesheetWorkspace canReview={canReview} today={cairoDate()} />
    </main>
  );
}
