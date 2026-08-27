import 'server-only';

/**
 * Google OAuth2 (authorization-code) helpers for the "دخول محامي" flow.
 * Uses only fetch + the standard OpenID Connect endpoints — no SDK. The
 * credentials come from GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET and the
 * redirect URI is built from NEXT_PUBLIC_APP_URL (all already set on Vercel).
 */

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

/** HttpOnly cookie that carries the signed OAuth state between start & callback. */
export const OAUTH_STATE_COOKIE = 'hloauth';

export type GoogleIdentity = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
};

function googleEnv() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set');
  }
  return { clientId, clientSecret };
}

/** Canonical public origin — used for the OAuth redirect URI. */
export function appOrigin(req?: { headers: Headers; url: string }): string {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');

  if (req) {
    const forwardedProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
    const proto = process.env.NODE_ENV === 'production' ? 'https' : forwardedProto || 'http';
    const host = req.headers.get('host') || new URL(req.url).host;
    return `${proto}://${host}`;
  }
  return 'http://localhost:3000';
}

export function googleRedirectUri(req?: { headers: Headers; url: string }): string {
  return `${appOrigin(req)}/api/auth/google/callback`;
}

export function buildGoogleAuthUrl(state: string, redirectUri: string): string {
  const { clientId } = googleEnv();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
    include_granted_scopes: 'true',
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

/** Exchange an authorization code for an id_token (server-side, secret never leaves). */
export async function exchangeCode(code: string, redirectUri: string): Promise<{ idToken: string }> {
  const { clientId, clientSecret } = googleEnv();
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const data = (await res.json()) as {
    id_token?: string;
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.id_token) {
    throw new Error(data.error_description || data.error || 'token exchange failed');
  }
  return { idToken: data.id_token };
}

/** Decode the id_token JWT payload (obtained directly from Google over HTTPS). */
export function decodeIdToken(idToken: string): GoogleIdentity {
  const parts = idToken.split('.');
  if (parts.length < 2) throw new Error('malformed id_token');
  const payload = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  const json = JSON.parse(payload) as {
    sub: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
  };
  if (!json.sub) throw new Error('id_token missing sub');
  return {
    sub: json.sub,
    email: json.email ?? '',
    emailVerified: json.email_verified === true,
    name: json.name,
  };
}
