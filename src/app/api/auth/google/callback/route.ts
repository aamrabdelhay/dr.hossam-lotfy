import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSessionCookie, verifyOAuthState } from '@/lib/auth';
import { decodeIdToken, exchangeCode, googleRedirectUri, OAUTH_STATE_COOKIE } from '@/lib/google-oauth';

const clearState = (res: NextResponse) => {
  res.cookies.set(OAUTH_STATE_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
};

/**
 * Google OAuth callback for lawyer login. Verifies the state, exchanges the
 * code for an id_token, matches the Google identity to a lawyer profile, and
 * opens a session only for an approved lawyer.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  const storedState = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const redirectUri = googleRedirectUri(req);

  const fail = (reason: string) =>
    clearState(NextResponse.redirect(new URL(`/auth?error=${encodeURIComponent(reason)}`, req.url), { status: 307 }));

  if (!code || !state || state !== storedState || !verifyOAuthState(state)) {
    return fail('oauth');
  }

  try {
    const { idToken } = await exchangeCode(code, redirectUri);
    const identity = decodeIdToken(idToken);
    if (!identity.email || !identity.emailVerified) {
      return fail('oauth');
    }

    const email = identity.email.toLowerCase();
    const lawyer = await prisma.lawyer.findFirst({
      where: { OR: [{ googleSub: identity.sub }, { googleEmail: email }] },
    });

    if (!lawyer) {
      return fail('not_registered');
    }

    // Link / refresh the Google identity the first time they sign in.
    if (lawyer.googleSub !== identity.sub || lawyer.googleEmail !== email) {
      await prisma.lawyer
        .update({
          where: { id: lawyer.id },
          data: { googleSub: identity.sub, googleEmail: lawyer.googleEmail ?? email },
        })
        .catch(() => undefined);
    }

    if (!lawyer.approvedAt || !lawyer.active) {
      return fail('not_approved');
    }

    const res = clearState(NextResponse.redirect(new URL(`/lawyers/${lawyer.slug}`, req.url), { status: 307 }));
    const cookie = await createSessionCookie({
      role: 'lawyer',
      lawyerId: lawyer.id,
      ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
      userAgent: req.headers.get('user-agent') ?? undefined,
    });
    res.cookies.set(cookie.name, cookie.value, cookie.options as never);
    return res;
  } catch (err) {
    console.error('[google-oauth] callback failed:', err);
    return fail('oauth');
  }
}
