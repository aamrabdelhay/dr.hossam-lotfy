import { NextResponse } from 'next/server';
import { user } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!await user()) return NextResponse.json({ error: 'سجّل الدخول أولاً' }, { status: 401 });
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  if (!key) return NextResponse.json({ error: 'إعداد مفاتيح إشعارات الأجهزة غير مكتمل.' }, { status: 503 });
  return NextResponse.json({ key }, { headers: { 'Cache-Control': 'no-store' } });
}
