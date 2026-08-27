import 'server-only';

/**
 * In-memory fixed-window rate limiter (per instance). Used to protect
 * sensitive endpoints — the login route allows 5 attempts / 15 minutes
 * per IP+email combination. For multi-instance production deployments
 * swap the store for Redis; the interface stays the same.
 */

type Bucket = { count: number; resetAt: number };

const globalStore = globalThis as unknown as { __hlRateStore?: Map<string, Bucket> };
const store: Map<string, Bucket> = globalStore.__hlRateStore ?? new Map();
globalStore.__hlRateStore = store;

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
};

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = store.get(key);

  if (store.size > 10_000) {
    // opportunistic cleanup
    for (const [k, v] of store) if (v.resetAt < now) store.delete(k);
  }

  if (!existing || existing.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return { ok: false, remaining: 0, retryAfterSec: Math.ceil((existing.resetAt - now) / 1000) };
  }
  return { ok: true, remaining: limit - existing.count, retryAfterSec: 0 };
}

/** Resets the window for a key (e.g. after a successful login). */
export function rateLimitReset(key: string) {
  store.delete(key);
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

/** Login-specific helper: 5 attempts per 15 minutes. */
export function loginRateKey(req: Request, identifier: string): string {
  return `login:${clientIp(req)}:${identifier.toLowerCase()}`;
}
