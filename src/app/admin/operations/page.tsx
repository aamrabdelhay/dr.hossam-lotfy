'import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CalendarClock, FileWarning, ArrowUpLeft, ShieldAlert } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getBranchScope } from "@/lib/branch-access";
import { isSeniorManagement } from "@/lib/office-workflow";
import { prisma } from "@/lib/prisma";
import { Card, Badge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "مركز العمليات الذكية" };
type TaskAlert = { id: string; description: string; scheduledDate: string; scheduledTime: string | null; locationName: string | null; caseName: string | null; caseNumber: string | null };
type CaseAlert = { id: string; name: string; number: string; clientName: string | null };

function cairoDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function AlertList({ title, items, empty, danger = false }: { title: string; items: TaskAlert[]; empty: string; danger?: boolean }) {
  return <section className="space-y-3">
    <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-extrabold text-navy-950">{title}</h2><Badge tone={items.length ? "gold" : "gray"}>{items.length === 12 ? "12+" : items.length}</Badge></div>
    {items.length === 0 ? <EmptyState title={empty}/> : <div className="space-y-2">{items.map((item) => <Link key={item.id} href={"/sessions/" + item.id} className={"block rounded-xl border bg-white p-3 transition hover:border-gold-400 " + (danger ? "border-red-100" : "border-navy-100")}>
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-extrabold text-navy-900">{item.description}</p><span className="text-[11px] font-bold text-navy-500">{item.scheduledDate}{item.scheduledTime ? " · " + item.scheduledTime : ""}</span></div>
      <p className="mt-1 text-xs font-semibold text-navy-500">{item.locationName || "مكان غير محدد"}{item.caseName ? " · " + item.caseName : ""}{item.caseNumber ? " — " + item.caseNumber : ""}</p>
    </Link>)}</div>}
  </section>;
}

export default async function OperationsCenterPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/auth");
  const [senior, scope] = await Promise.all([isSeniorManagement(session), getBranchScope(session)]);
  if (!senior && !scope.officeManager) redirect("/");
  const branchIds = scope.allBranches ? null : scope.branchIds;
  const today = cairoDate();

  const [overdue, uncovered, missingFiles] = await Promise.all([
    prisma.$queryRawUnsafe<TaskAlert[]>(
      "SELECT t.id,t.description,t.\"scheduledDate\"::text AS \"scheduledDate\",t.\"scheduledTime\",l.name AS \"locationName\",c.name AS \"caseName\",c.number AS \"caseNumber\" FROM tasks t LEFT JOIN locations l ON l.id=t.\"locationId\" LEFT JOIN case_records c ON c.id=t.\"caseId\" WHERE t.status IN ('PENDING','IN_PROGRESS') AND t.\"scheduledDate\" < $2::date AND ($1::text[] IS NULL OR COALESCE(t.branch_id,c.branch_id,'branch_main')=ANY($1::text[])) ORDER BY t.\"scheduledDate\" ASC,t.\"scheduledTime\" ASC NULLS LAST LIMIT 12",
      branchIds, today,
    ),
    prisma.$queryRawUnsafe<TaskAlert[]>(
      "SELECT t.id,t.description,t.\"scheduledDate\"::text AS \"scheduledDate\",t.\"scheduledTime\",l.name AS \"locationName\",c.name AS \"caseName\",c.number AS \"caseNumber\" FROM tasks t LEFT JOIN locations l ON l.id=t.\"locationId\" LEFT JOIN case_records c ON c.id=t.\"caseId\" WHERE t.status NOT IN ('COMPLETED','CANCELLED') AND t.\"scheduledDate\" >= $2::date AND t.\"scheduledDate\" <= ($2::date + INTERVAL '2 days') AND NOT EXISTS (SELECT 1 FROM task_assignments ta WHERE ta.\"taskId\"=t.id) AND ($1::text[] IS NULL OR COALESCE(t.branch_id,c.branch_id,'branch_main')=ANY($1::text[])) ORDER BY t.\"scheduledDate\" ASC,t.\"scheduledTime\" ASC NULLS LAST LIMIT 12",
      branchIds, today,
    ),
    prisma.$queryRawUnsafe<CaseAlert[]>(
      "SELECT c.id,c.name,c.number,c.\"clientName\" FROM case_records c WHERE c.\"archived_at\" IS NULL AND NOT EXISTS (SELECT 1 FROM case_files f WHERE f.case_id=c.id AND f.deleted_at IS NULL) AND ($1::text[] IS NULL OR COALESCE(c.branch_id,'branch_main')=ANY($1::text[])) ORDER BY c.id DESC LIMIT 12",
      branchIds,
    ),
  ]);

  return <main className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6">
    <header className="mb-6 rounded-3xl bg-navy-950 p-5 text-white sm:p-7">
      <p className="text-[10px] font-extrabold tracking-[0.2em] text-gold-400">INTELLIGENT OPERATIONS</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-black">مركز العمليات الذكية</h1><p className="mt-2 max-w-2xl text-xs leading-6 text-slate-300">متابعة مبنية على السجلات الفعلية: المهام المتأخرة، الجلسات القريبة غير المسندة، والقضايا التي لا تحتوي على مستندات مرفوعة.</p></div><Link href="/admin/office" className="rounded-xl border border-white/20 px-4 py-2 text-xs font-bold text-white">الإدارة العامة</Link></div>
    </header>
    <div className="mb-6 grid gap-3 sm:grid-cols-3">
      <Card className="p-4"><AlertTriangle size={18} className="text-red-600"/><p className="mt-3 text-3xl font-black text-navy-950">{overdue.length}{overdue.length === 12 ? "+" : ""}</p><p className="mt-1 text-xs font-bold text-navy-500">مهام متأخرة</p></Card>
      <Card className="p-4"><CalendarClock size={18} className="text-gold-700"/><p className="mt-3 text-3xl font-black text-navy-950">{uncovered.length}{uncovered.length === 12 ? "+" : ""}</p><p className="mt-1 text-xs font-bold text-navy-500">جلسات قريبة بلا محامٍ مسند</p></Card>
      <Card className="p-4"><FileWarning size={18} className="text-navy-700"/><p className="mt-3 text-3xl font-black text-navy-950">{missingFiles.length}{missingFiles.length === 12 ? "+" : ""}</p><p className="mt-1 text-xs font-bold text-navy-500">قضايا بلا مستندات مرفوعة</p></Card>
    </div>
    <div className="mb-6 flex items-center gap-2 rounded-xl border border-gold-200 bg-gold-50/60 p-3 text-xs font-bold text-navy-700"><ShieldAlert size={16} className="shrink-0 text-gold-700"/>تنبيهات تشغيلية تعتمد على السجلات، وليست أحكامًا قانونية أو تنبؤًا بنتيجة القضايا. راجع كل حالة قبل اتخاذ إجراء.</div>
    <div className="grid gap-6 lg:grid-cols-2"><AlertList title="المهام المتأخرة" items={overdue} empty="لا توجد مهام متأخرة ضمن نطاق صلاحياتك." danger/><AlertList title="جلسات خلال 48 ساعة دون محامٍ مسند" items={uncovered} empty="لا توجد جلسات قريبة غير مغطاة."/></div>
    <section className="mt-7">
      <div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-sm font-extrabold text-navy-950">قضايا تحتاج استكمال المستندات</h2><Badge tone={missingFiles.length ? "gold" : "gray"}>{missingFiles.length}</Badge></div>
      {missingFiles.length === 0 ? <EmptyState title="لا توجد قضايا بلا مستندات مرفوعة ضمن النطاق الحالي."/> : <div className="grid gap-2 sm:grid-cols-2">{missingFiles.map((item) => <Link key={item.id} href={"/cases/" + item.id} className="rounded-xl border border-navy-100 bg-white p-3 hover:border-gold-400"><div className="flex items-start justify-between gap-2"><p className="text-sm font-extrabold text-navy-900">{item.name}</p><ArrowUpLeft size={15} className="shrink-0 text-gold-700"/></div><p className="mt-1 text-xs text-navy-500">{item.number}{item.clientName ? " · " + item.clientName : ""}</p></Link>)}</div>}
    </section>
    <p className="mt-6 text-[10px] font-medium text-navy-400">المعروض حتى 12 نتيجة في كل مجموعة، وفق نطاق الفروع المسموح للحساب.</p>
  </main>;
}
