import 'server-only';
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import type { SessionUser } from '@/lib/auth';
import { sendTelegramGroupNotification } from '@/lib/telegram';

export const officeId = (prefix: string) => `${prefix}_${crypto.randomUUID().replaceAll('-', '')}`;

export async function isSeniorManagement(session: SessionUser | null): Promise<boolean> {
  if (!session) return false;
  if (session.role === 'admin' && (session.userRole === 'ADMIN' || session.userRole === 'SUPER_ADMIN')) return true;
  const userId = session.role === 'admin' ? session.userId : null;
  const lawyerId = session.role === 'lawyer' ? session.lawyerId : null;
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT "id" FROM "office_senior_members" WHERE ("user_id"=$1 AND $1 IS NOT NULL) OR ("lawyer_id"=$2 AND $2 IS NOT NULL) LIMIT 1`,
    userId,
    lawyerId,
  ).catch(() => []);
  return rows.length > 0;
}

export async function isFinanceManagement(session: SessionUser | null): Promise<boolean> {
  if (!session) return false;
  if (await isSeniorManagement(session)) return true;
  const lawyerId = session.role === 'lawyer' ? session.lawyerId : null;
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT "id" FROM "office_finance_members" WHERE "lawyer_id"=$1 LIMIT 1`,
    lawyerId,
  ).catch(() => []);
  return rows.length > 0;
}

export async function createOfficeRequest(input: {
  type: string;
  title: string;
  reason?: string | null;
  payload?: unknown;
  session: SessionUser;
  targetEntityType?: string | null;
  targetEntityId?: string | null;
}) {
  const id = officeId('req');
  const userId = input.session.role === 'admin' ? input.session.userId : null;
  const lawyerId = input.session.role === 'lawyer' ? input.session.lawyerId : null;
  await prisma.$executeRawUnsafe(
    `INSERT INTO "office_requests" ("id","type","title","reason","payload_json","requested_by_user_id","requested_by_lawyer_id","target_entity_type","target_entity_id") VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9)`,
    id,
    input.type,
    input.title,
    input.reason ?? null,
    JSON.stringify(input.payload ?? {}),
    userId,
    lawyerId,
    input.targetEntityType ?? null,
    input.targetEntityId ?? null,
  );

  const requester = input.session.name || (lawyerId ? `Lawyer ${lawyerId}` : `User ${userId ?? 'unknown'}`);
  const telegramMessage = [
    '<b>🏛️ Loutfi Law Firm</b>',
    '<b>طلب إداري جديد</b>',
    '',
    `<b>النوع:</b> ${escapeTelegramHtml(input.type)}`,
    `<b>العنوان:</b> ${escapeTelegramHtml(input.title)}`,
    `<b>مقدم الطلب:</b> ${escapeTelegramHtml(requester)}`,
    input.reason ? `<b>السبب:</b> ${escapeTelegramHtml(input.reason)}` : '',
    '',
    `<a href="https://dr-hossam-lotfy-hw88.vercel.app/admin/office">فتح طلبات الإدارة</a>`,
  ].filter(Boolean).join('\n');

  await sendTelegramGroupNotification(telegramMessage).catch((error) => {
    console.error('Telegram office request notification failed:', error);
  });

  return id;
}

function escapeTelegramHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export async function notifySenior(title: string, body: string, link?: string) {
  const members = await prisma.$queryRawUnsafe<Array<{ user_id: string | null; lawyer_id: string | null }>>(`SELECT "user_id","lawyer_id" FROM "office_senior_members"`);
  for (const member of members) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "notifications" ("id","userId","lawyerId","type","title","body","link","createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
      officeId('ntf'), member.user_id, member.lawyer_id, 'OFFICE_REQUEST', title, body, link ?? null,
    ).catch(() => undefined);
  }
}
