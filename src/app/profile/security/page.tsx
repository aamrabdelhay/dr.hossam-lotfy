'import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentSessionRecord } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SessionManager } from "@/components/session-manager";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "الأجهزة وجلسات الدخول" };

export default async function ProfileSecurityPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/auth");
  const current = await getCurrentSessionRecord();
  if (!current) redirect("/auth");
  const owner = session.role === "admin" ? { role: "admin", userId: session.userId } : { role: "lawyer", lawyerId: session.lawyerId };
  const rows = await prisma.authSession.findMany({
    where: { ...owner, revokedAt: null },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, ip: true, userAgent: true, createdAt: true, expiresAt: true },
  });
  const initial = rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    current: row.id === current.id,
  }));
  return <main className="mx-auto w-full max-w-[900px] px-4 py-6 sm:px-6">
    <div className="mb-5"><Link href="/profile" className="text-xs font-bold text-navy-500">← الملف الشخصي</Link><h1 className="mt-3 text-2xl font-extrabold text-navy-950">أمان الحساب</h1><p className="mt-1 text-sm text-navy-500">تحكم في الأجهزة التي ما زالت مسجلة الدخول بحسابك.</p></div>
    <Card className="p-4 sm:p-5"><SessionManager initial={initial}/></Card>
  </main>;
}
