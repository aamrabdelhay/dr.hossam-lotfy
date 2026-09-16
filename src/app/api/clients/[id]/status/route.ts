import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { user } from '@/lib/api';
import { createOfficeRequest, isSeniorManagement, officeId, notifySenior } from '@/lib/office-workflow';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await user(); if (!session) return NextResponse.json({ error: 'يجب تسجيل الدخول' }, { status: 401 });
  const { id } = await params; const data = z.object({ status: z.enum(['POTENTIAL','MAIN','FOLLOW_UP','REJECTED']), reason: z.string().max(1000).optional() }).parse(await req.json());
  if (data.status === 'REJECTED') {
    await prisma.$executeRawUnsafe(`UPDATE "clients" SET "status"='REJECTED',"rejection_reason"=$2,"archived_at"=NOW() WHERE "id"=$1`, id, data.reason ?? null);
  } else {
    await prisma.$executeRawUnsafe(`UPDATE "clients" SET "status"=$2,"archived_at"=NULL,"rejection_reason"=NULL WHERE "id"=$1`, id, data.status);
  }
  return NextResponse.json({ ok: true });
}
