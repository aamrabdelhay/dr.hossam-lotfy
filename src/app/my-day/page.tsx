import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Clock3, AlertTriangle, FileText, MapPin } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getBranchScope } from "@/lib/branch-access";
import { prisma } from "@/lib/prisma";
import { Card, Badge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "يومي" };

function cairoDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default async function MyDayPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/auth");
  const scope = await getBranchScope(session);
  const today = cairoDate();
  const todayDate = new Date(today + "T00:00:00.000Z");
  let allowedTaskIds: string[] | null = null;

  if (!scope.allBranches) {
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      "SELECT id FROM tasks WHERE COALESCE(branch_id, 'branch_main') = ANY($1::text[])",
      scope.branchIds,
    );
    allowedTaskIds = rows.map((row) => row.id);
  }

  const baseWhere: any = {
    ...(allowedTaskIds ? { id: { in: allowedTaskIds } } : {}),
    status: { not: "CANCELLED" },
    ...(session.role === "lawyer" ? { assignees: { some: { lawyerId: session.lawyerId } } } : {}),
  };

  const [todayTasks, overdueTasks] = await Promise.all([
    prisma.task.findMany({
      where: { ...baseWhere, scheduledDate: todayDate },
      include: {
        location: { select: { name: true, type: true } },
        caseRecord: { select: { id: true, name: true, number: true, clientName: true } },
        assignees: { select: { lawyer: { select: { fullName: true } }, completedAt: true } },
      },
      orderBy: [{ scheduledTime: "asc" }, { createdAt: "asc" }],
      take: 100,
    }),
    prisma.task.findMany({
      where: { ...baseWhere, status: { in: ["PENDING", "IN_PROGRESS"] }, scheduledDate: { lt: todayDate } },
      include: {
        location: { select: { name: true, type: true } },
        caseRecord: { select: { id: true, name: true, number: true, clientName: true } },
      },
      orderBy: [{ scheduledDate: "asc" }, { scheduledTime: "asc" }],
      take: 25,
    }),
  ]);

  const titleDate = new Intl.DateTimeFormat("ar-EG", { timeZone: "Africa/Cairo", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-[10px] font-extrabold tracking-widest text-gold-700">MY DAY</p><h1 className="mt-1 text-2xl font-extrabold text-navy-950">يومي</h1><p className="mt-1 text-sm font-semibold text-navy-500">{titleDate}</p></div>
        <div className="flex gap-2"><Link href="/court-mode" className="rounded-xl bg-navy-950 px-4 py-2.5 text-xs font-extrabold text-white">وضع المحاكم</Link><Link href="/calendar" className="rounded-xl border border-navy-200 bg-white px-4 py-2.5 text-xs font-extrabold text-navy-700">التقويم</Link></div>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="p-4"><CalendarDays size={18} className="text-gold-700"/><p className="mt-3 text-2xl font-black text-navy-950">{todayTasks.length}</p><p className="mt-1 text-xs font-bold text-navy-500">مواعيد ومهام اليوم</p></Card>
        <Card className="p-4"><AlertTriangle size={18} className="text-red-600"/><p className="mt-3 text-2xl font-black text-navy-950">{overdueTasks.length}</p><p className="mt-1 text-xs font-bold text-navy-500">متأخرة وتحتاج متابعة</p></Card>
        <Card className="col-span-2 p-4 sm:col-span-1"><Clock3 size={18} className="text-navy-600"/><p className="mt-3 text-2xl font-black text-navy-950">{todayTasks.filter((task) => task.status !== "COMPLETED").length}</p><p className="mt-1 text-xs font-bold text-navy-500">لم تُغلق بعد</p></Card>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-base font-extrabold text-navy-900">مواعيد ومهام اليوم</h2>
        {todayTasks.length === 0 ? <EmptyState title="لا توجد مواعيد أو مهام مسجلة اليوم" hint="سيظهر هنا كل تكليف أو موعد مرتبط بحسابك أو بنطاق فرعك."/> :
          <div className="space-y-3">{todayTasks.map((task) => <Card key={task.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><Badge tone={task.status === "COMPLETED" ? "green" : "gold"}>{task.status === "COMPLETED" ? "مكتملة" : task.status === "IN_PROGRESS" ? "جارية" : "معلقة"}</Badge><span className="inline-flex items-center gap-1 text-xs font-extrabold text-gold-700"><Clock3 size={13}/>{task.scheduledTime ? String(task.scheduledTime).slice(0,5) : "بدون وقت"}</span></div>
              <h3 className="mt-2 text-sm font-extrabold leading-6 text-navy-950">{task.description}</h3><p className="mt-1 flex items-center gap-1 text-xs font-semibold text-navy-500"><MapPin size={13}/>{task.location.name}</p>
              {task.caseRecord && <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-navy-500"><FileText size={13}/>{task.caseRecord.name}{task.caseRecord.number ? " — " + task.caseRecord.number : ""}</p>}
              {task.assignees.length > 0 && <p className="mt-1 text-[11px] font-semibold text-navy-400">المكلّفون: {task.assignees.map((entry) => entry.lawyer.fullName).join("، ")}</p>}
            </div><Link href={"/sessions/" + task.id} className="rounded-lg bg-navy-950 px-3 py-2 text-xs font-extrabold text-white">التفاصيل</Link></div>
          </Card>)}</div>}
      </section>

      <section><h2 className="mb-3 text-base font-extrabold text-red-700">المهام المتأخرة</h2>
        {overdueTasks.length === 0 ? <p className="rounded-xl border border-dashed border-navy-200 bg-white p-5 text-center text-xs font-semibold text-navy-400">لا توجد مهام متأخرة مسجلة.</p> :
          <div className="space-y-2">{overdueTasks.map((task) => <Link key={task.id} href={"/sessions/" + task.id} className="block rounded-xl border border-red-100 bg-red-50/60 p-3 hover:border-red-300">
            <p className="text-sm font-extrabold text-navy-900">{task.description}</p><p className="mt-1 text-xs font-semibold text-red-700">{task.scheduledDate?.toISOString().slice(0,10)} · {task.location.name}</p>
            {task.caseRecord && <p className="mt-1 text-[11px] text-navy-500">{task.caseRecord.name}{task.caseRecord.number ? " — " + task.caseRecord.number : ""}</p>}
          </Link>)}</div>}
      </section>
    </main>
  );
}
