import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { handle, json, requirePermission } from '@/lib/api';

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

  // rotate: invalidate previous tokens
  await prisma.accessToken.updateMany({ where: { lawyerId: id }, data: { consumedAt: new Date() } });

  const token = crypto.randomBytes(24).toString('base64url');
  await prisma.accessToken.create({
    data: { token, lawyerId: id, label: 'رابط دخول', expiresAt: new Date(Date.now() + 365 * 86400000) },
  });

  // Prefer the configured base URL; otherwise derive origin from the request
  // Host header so the link works from whatever host the client used.
  const host = req.headers.get('host') || new URL(req.url).host;
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  const origin = process.env.NEXT_PUBLIC_BASE_URL || `${proto}://${host}`;
  return json({ ok: true, url: `${origin}/access/${token}` }, { status: 201 });
});
