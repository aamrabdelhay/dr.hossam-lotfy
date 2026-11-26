// Part 3 item 187: staff attendance. Own taps only, senior reads all, no delete. Synthetic data only.
import { db, ok, q, insertDummy, adminCookie, lawyerCookie, api, done } from './helpers.mjs';
await db.connect();
const t = 'sa' + Date.now();
const call = (p, c, m = 'GET', b) => api(p, c, { method: m, ...(b ? { body: JSON.stringify(b) } : {}) });
const ac = await adminCookie();
for (const k of ['a', 'b']) await insertDummy('lawyers', { id: t + k, fullName: 'SA ' + k + t, email: t + k + '@example.test', slug: t + k + 's', approvedAt: new Date(), active: true });
const ca = await lawyerCookie('SA a' + t, t + 'a@example.test'), cb = await lawyerCookie('SA b' + t, t + 'b@example.test');
ok((await call('/api/attendance', null, 'POST', { action: 'IN' })).status >= 401, 'anonymous refused');
ok((await call('/api/attendance', ac, 'POST', { action: 'IN' })).status === 403, 'an admin account cannot tap for a lawyer');
ok((await call('/api/attendance', ca, 'POST', { action: 'OUT' })).status === 409, 'check-out without check-in refused');
ok((await call('/api/attendance', ca, 'POST', { action: 'IN' })).status === 201, 'lawyer A checks in');
ok((await call('/api/attendance', ca, 'POST', { action: 'IN' })).status === 409, 'double check-in refused');
ok((await call('/api/attendance', cb, 'POST', { action: 'IN' })).status === 201, 'lawyer B checks in');
ok((await call('/api/attendance', ca, 'POST', { action: 'OUT' })).status === 200, 'lawyer A checks out');
const own = await (await call('/api/attendance', ca)).json(); ok(own.scope === 'own' && own.entries.length === 1 && own.entries[0].out_at, 'a lawyer sees only own rows');
const all = (await (await call('/api/attendance', ac)).json()); ok(all.scope === 'all' && all.entries.filter((e) => e.lawyer_id.startsWith(t.slice(0, 2)) && e.name.includes(t)).length === 2, 'senior sees everyone');
ok((await call('/api/attendance', ac, 'DELETE')).status === 405, 'no delete');
await done('staff-attendance');
