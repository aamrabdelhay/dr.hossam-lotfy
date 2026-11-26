// Shared helpers for the e2e tests. Synthetic data only, disposable database only.
import pg from 'pg';
export const BASE = process.env.APP_BASE || 'http://127.0.0.1:3300';
export const CRON = process.env.CRON_SECRET, CODE = process.env.ADMIN_ACCESS_CODE;
export const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
export let fails = 0;
export const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
export const q = async (s, a = []) => (await db.query(s, a)).rows;
export async function insertDummy(table, extra = {}) {
  const cols = await q(`SELECT column_name,data_type,udt_name,column_default,is_nullable FROM information_schema.columns WHERE table_name=$1`, [table]);
  const vals = { ...extra };
  for (const c of cols) {
    if (c.column_name in vals || c.is_nullable === 'YES' || c.column_default) continue;
    if (c.data_type === 'USER-DEFINED') { vals[c.column_name] = (await q(`SELECT enumlabel FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname=$1 ORDER BY e.enumsortorder LIMIT 1`, [c.udt_name]))[0]?.enumlabel; continue; }
    vals[c.column_name] = /int|numeric/.test(c.data_type) ? 0 : /bool/.test(c.data_type) ? false : /timestamp|date/.test(c.data_type) ? new Date() : 'x' + Math.random().toString(36).slice(2, 10);
  }
  const names = Object.keys(vals);
  await q(`INSERT INTO "${table}" (${names.map(n => `"${n}"`).join(',')}) VALUES (${names.map((_, i) => '$' + (i + 1)).join(',')})`, names.map(n => vals[n]));
}
export async function adminCookie() {
  const r = await fetch(BASE + '/api/auth/admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: CODE }) });
  return (r.headers.getSetCookie?.() || []).map(c => c.split(';')[0]).join('; ');
}
export async function lawyerCookie(fullName, email) {
  const r = await fetch(BASE + '/api/auth/lawyer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: fullName, email }) });
  return (r.headers.getSetCookie?.() || []).map(c => c.split(';')[0]).join('; ');
}
export const api = (path, cookie, init = {}) => fetch(BASE + path, { ...init, headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...(init.headers || {}) } });
export const done = async (name) => { await db.end(); console.log(fails ? `${name}: FAILED ${fails}` : `${name}: ALL PASSED`); process.exit(fails ? 1 : 0); };
// Synthetic signed session for an ACCOUNT-based staff user (no Google login). Disposable test database only.
import crypto from 'node:crypto';
export async function accountCookie(userId, userRole) {
  const raw = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  await insertDummy('auth_sessions', { id: 'as_' + raw.slice(0, 12), tokenHash, role: 'admin', userRole, userId, expiresAt: new Date(Date.now() + 3600e3) });
  const body = 'v1.' + raw;
  const sig = crypto.createHmac('sha256', process.env.SESSION_SECRET).update(body).digest('base64url');
  return 'hlsession=' + body + '.' + sig;
}
