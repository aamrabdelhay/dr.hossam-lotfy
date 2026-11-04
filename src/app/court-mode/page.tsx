'import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock3, MapPin, Phone, FileText } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, Badge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "وضع المحاكم" };

function cairoDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default async function CourtModePage() {
  const session = await getCurrentUser();
  if (!session) redirect("/auth");
  if (session.role !== "lawyer") redirect("/my-day");
  const today = cairoDate();
  const day = new Date(today + "T00:00:00.000Z");
  const tasks = await prisma.task.findMany({
    where: { status: { not: "CANCELLED" }, scheduledDate: day, assignees: { some: { lawyerId: session.lawyerId } }, location: { type: "COURT" } },
    include: {
      location: { select: { name: true, address: true, phone: true, googleMapsUrl: true, governorate: true, city: true } },
      caseRecord: { select: { id: true, name: true, number: true, clientName: true } },
    },
    orderBy: [{ scheduledTime: "asc" }, { createdAt: "asc" }],
    take: 100,
  });
  const dateLabel = new Intl.DateTimeFormat("ar-EG", { timeZone: "Africa/Cairo", weekday: "long", day: "numeric", month: "long" }).format(new Date());
  return (
    <main className="mx-auto w-full max-w-[760px] px-3 py-4 sm:px-5">
      <header className="mb-5 rounded-3xl bg-navy-950 p-5 text-white shadow-lg">
        <p className="text-[10px] font-extrabold tracking-widest text-gold-400">COURT MODE</p>
        <div className="mt-2 flex items-center justify-between gap-3"><div><h1 className="text-2xl font-black">وضع المحاكم</h1><p className="mt-1 text-xs font-semibold text-slate-300">{dateLabel}</p></div><Link href="/my-day" className="rounded-xl border border-white/20 px-3 py-2 text-xs font-bold text-white">يومي</Link></div>
        <div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl bg-white/10 p-3"><p className="text-2xl font-black">{tasks.length}</p><p className="text-[11px] font-bold text-slate-300">جلسات اليوم</p></div><div className="rounded-xl bg-white/10 p-3"><p className="text-2xl font-black">{tasks.filter((x) => x.status !== "COMPLETED").length}</p><p className="text-[11px] font-bold text-slate-300">لم تُنجز بعد</p></div></div>
      </header>
      {tasks.length === 0 ? <EmptyState title="لا توجد جلسات محاكم مسندة إليك اليوم" hint="تظهر هنا جلسات المحاكم المسندة إلى حسابك فقط."/> :
        <div className="space-y-3">{tasks.map((task, index) => {
          const maps = task.location.googleMapsUrl || "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([task.location.name, task.location.address, task.location.city, task.location.governorate].filter(Boolean).join(" "));
          return <Card key={task.id} className="overflow-hidden p-0">
            <div className="flex items-center justify-between bg-ivory-50 px-4 py-3"><span className="text-xs font-extrabold text-gold-700">جلسة {index + 1}</span><Badge tone={task.status === "COMPLETED" ? "green" : "gold"}>{task.status === "COMPLETED" ? "تمت" : task.status === "IN_PROGRESS" ? "جارية" : "مطلوبة"}</Badge></div>
            <div className="space-y-3 p-4">
              <div><h2 className="text-base font-extrabold leading-7 text-navy-950">{task.description}</h2><p className="mt-1 flex items-center gap-1 text-sm font-bold text-navy-700"><Clock3 size={15}/>{task.scheduledTime || "الوقت غير محدد"}</p></div>
              <div className="rounded-xl border border-navy-100 bg-white p-3"><p className="flex items-center gap-2 text-sm font-extrabold text-navy-900"><MapPin size={16} className="text-gold-600"/>{task.location.name}</p>{task.location.address && <p className="mt-1 text-xs leading-5 text-navy-500">{task.location.address}</p>}</div>
              {task.caseRecord && <div className="rounded-xl bg-ivory-50 p-3"><p className="flex items-center gap-2 text-xs font-bold text-navy-500"><FileText size={14}/>القضية</p><p className="mt-1 text-sm font-extrabold text-navy-900">{task.caseRecord.name}</p><p className="text-xs font-semibold text-navy-500">{task.caseRecord.number}{task.caseRecord.clientName ? " · " + task.caseRecord.clientName : ""}</p></div>}
              <div className="grid grid-cols-2 gap-2"><a href={maps} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-navy-950 px-3 text-xs font-extrabold text-white"><MapPin size={15}/>فتح الاتجاهات</a>{task.location.phone ? <a href={"tel:" + task.location.phone} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-navy-200 px-3 text-xs font-extrabold text-navy-800"><Phone size={15}/>اتصال بالمحكمة</a> : <Link href={"/sessions/" + task.id} className="flex min-h-12 items-center justify-center rounded-xl border border-navy-200 px-3 text-xs font-extrabold text-navy-800">فتح الجلسة</Link>}</div>
              <Link href={"/sessions/" + task.id} className="block rounded-xl bg-gold-500 px-3 py-3 text-center text-xs font-extrabold text-navy-950">فتح الجلسة وتسجيل النتيجة</Link>
            </div>
          </Card>;
        })}</div>}
    </main>
  );
}
