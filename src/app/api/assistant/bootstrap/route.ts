import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { user } from '@/lib/api';

function cairoToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export async function GET() {
  const session = await user();
  if (!session) return NextResponse.json({ error: 'يجب تسجيل الدخول' }, { status: 401 });
  const today = cairoToday();
  const [lawyers, locations, cases, todayTasks] = await Promise.all([
    prisma.lawyer.findMany({ where: { active: true }, orderBy: { fullName: 'asc' }, take: 100, select: { id: true, fullName: true } }),
    prisma.location.findMany({ orderBy: { name: 'asc' }, take: 300, select: { id: true, name: true } }),
    prisma.caseRecord.findMany({ orderBy: { id: 'desc' }, take: 100, select: { id: true, name: true, number: true, clientName: true } }),
    prisma.task.findMany({
      where: { status: { notIn: ['COMPLETED', 'CANCELLED'] }, scheduledDate: new Date(`${today}T00:00:00`) },
      orderBy: [{ scheduledTime: 'asc' }, { createdAt: 'desc' }], take: 50,
      include: { location: { select: { name: true } }, caseRecord: { select: { name: true, number: true } }, assignees: { select: { lawyer: { select: { fullName: true } } } } },
    }),
  ]);
  return NextResponse.json({
    ok: true,
    lawyers: lawyers.map((item) => ({ id: item.id, name: item.fullName })),
    locations: locations.map((item) => ({ id: item.id, name: item.name })),
    cases: cases.map((item) => ({ id: item.id, name: item.name, number: item.number, clientName: item.clientName })),
    todayTasks: todayTasks.map((item) => ({ id: item.id, description: item.description, time: item.scheduledTime, location: item.location?.name || null, caseName: item.caseRecord?.name || null, caseNumber: item.caseRecord?.number || null, lawyers: item.assignees.map((x) => x.lawyer.fullName) })),
  }, { headers: { 'Cache-Control': 'private, max-age=1800, stale-while-revalidate=3600' } });
}
