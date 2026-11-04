'import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { user } from "@/lib/api";
import { getCurrentSessionRecord } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await user();
  if (!session) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
  const current = await getCurrentSessionRecord();
  if (!current) return NextResponse.json({ error: "انتهت جلسة الدخول" }, { status: 401 });
  const owner = session.role === "admin" ? { role: "admin", userId: session.userId } : { role: "lawyer", lawyerId: session.lawyerId };
  const rows = await prisma.authSession.findMany({
    where: { ...owner, revokedAt: null },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, ip: true, userAgent: true, createdAt: true, expiresAt: true },
  });
  return NextResponse.json({
    sessions: rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), expiresAt: row.expiresAt.toISOString(), current: row.id === current.id })),
  }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(request: Request) {
  const session = await user();
  if (!session) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
  const current = await getCurrentSessionRecord();
  if (!current) return NextResponse.json({ error: "انتهت جلسة الدخول" }, { status: 401 });
  let payload: unknown;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 }); }
  const parsed = z.object({ sessionId: z.string().min(1).max(128) }).safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "معرف الجلسة غير صالح" }, { status: 400 });
  if (parsed.data.sessionId === current.id) return NextResponse.json({ error: "لا يمكن إنهاء الجلسة الحالية من هنا. استخدم تسجيل الخروج." }, { status: 400 });
  const owner = session.role === "admin" ? { role: "admin", userId: session.userId } : { role: "lawyer", lawyerId: session.lawyerId };
  const result = await prisma.authSession.updateMany({
    where: { id: parsed.data.sessionId, ...owner, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (!result.count) return NextResponse.json({ error: "الجلسة غير موجودة أو تم إنهاؤها بالفعل" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
