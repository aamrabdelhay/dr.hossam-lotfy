import { NextResponse, type NextRequest } from 'next/server';
import { createOAuthState } from '@/lib/auth';
import { buildGoogleAuthUrl, googleRedirectUri, OAUTH_STATE_COOKIE } from '@/lib/google-oauth';

/**
 * Starts the "دخول محامي" flow: build the Google authorization URL and hand
 * the caller to Google with a signed, expiring state cookie (CSRF guard).
 */
export async function GET(req: NextRequest) {
  const state = createOAuthState();
  const redirectUri = googleRedirectUri(req);
  const url = buildGoogleAuthUrl(state, redirectUri);

  const res = NextResponse.redirect(url);
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return res;
}
