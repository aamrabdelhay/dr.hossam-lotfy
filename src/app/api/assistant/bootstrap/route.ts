import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { user } from '@/lib/api';

export async function GET() {
  const session = await user();
  if (!session) return NextResponse.json({ error: 'يجب تسجيل الدخول' }, { status: 401 });

  const [lawyers, locations, cases] = await Promise.all([
    prisma.lawyer.findMany({ where: { active: true }, orderBy: { fullName: 'asc' }, take: 100, select: { id: true, fullName: true } }),
    prisma.location.findMany({ orderBy: { name: 'asc' }, take: 300, select: { id: true, name: true } }),
    prisma.caseRecord.findMany({ orderBy: { id: 'desc' }, take: 100, select: { id: true, name: true, number: true } }),
  ]);

  return NextResponse.json({
    ok: true,
    lawyers: lawyers.map((item) => ({ id: item.id, name: item.fullName })),
    locations: locations.map((item) => ({ id: item.id, name: item.name })),
    cases: cases.map((item) => ({ id: item.id, name: item.name, number: item.number })),
  }, { headers: { 'Cache-Control': 'private, max-age=1800, stale-while-revalidate=3600' } });
}
