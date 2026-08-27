import crypto from 'node:crypto';
import { handle, json, requirePermission } from '@/lib/api';
import { prisma } from '@/lib/prisma';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Secure access mechanism for lawyers (no traditional password):
 * the admin generates a one-person access link. Opening it creates a
 * secure session for that lawyer only. Tokens can be rotated at any time.
 */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  await requirePermission('manageLawyers');

  const lawyer = await prisma.lawyer.findUnique({ where: { id } });
  if (!lawyer) return json({ error: 'المحامي غير موجود' }, { status: 404 });

  // Rotate: invalidate previous tokens before issuing a new one.
  await prisma.accessToken.updateMany({ where: { lawyerId: id }, data: { consumedAt: new Date() } });

  const token = crypto.randomBytes(24).toString('base64url');
  await prisma.accessToken.create({
    data: { token, lawyerId: id, label: 'رابط دخول', expiresAt: new Date(Date.now() + 30 * 86400000) },
  });

  // Prefer the configured canonical site URL. In production, never construct
  // an access link over plain HTTP from an untrusted/missing forwarded header.
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL;
  const host = req.headers.get('host') || new URL(req.url).host;
  const forwardedProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const proto = process.env.NODE_ENV === 'production' ? 'https' : (forwardedProto || 'http');
  const origin = (configuredOrigin || `${proto}://${host}`).replace(/\/$/, '');

  return json({ ok: true, url: `${origin}/access/${token}` }, { status: 201 });
});
