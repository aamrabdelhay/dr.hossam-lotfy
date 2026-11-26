// Part 4 item 227: per-use consented location proof. Synthetic data only.
import { db, ok, q, insertDummy, adminCookie, lawyerCookie, api, done } from './helpers.mjs';
await db.connect();
const t = 'al' + Date.now(); const ac = await adminCookie();
for (const k of ['a', 'b']) await insertDummy('lawyers', { id: t + k, fullName: 'AL ' + k, email: t + k + '@example.test', slug: t + k + 's', approvedAt: new Date(), active: true });
const ca = await lawyerCookie('AL a', t + 'a@example.test'); const cb = await lawyerCookie('AL b', t + 'b@example.test');
const post = (c, o) => api('/api/attendance/location', c, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(o) });
const good = { phase: 'IN', lat: 30.04, lon: 31.23, accuracy: 20, consent: true };
ok((await post(ca, good)).status === 409, 'no attendance record yet: refused');
await api('/api/attendance', ca, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'IN' }) });
ok((await post(ca, { ...good, consent: false })).status === 400, 'consent must be true');
ok((await post(ca, { ...good, lat: 95 })).status === 400, 'bad coordinates refused');
ok((await post(ca, good)).status === 201, 'consented proof saved');
ok((await post(ca, good)).status === 409, 'one proof per record and phase');
ok((await post(ac, good)).status === 403, 'admin cannot post for a lawyer');
const own = await (await api('/api/attendance/location', ca)).json(); const other = await (await api('/api/attendance/location', cb)).json(); const all = await (await api('/api/attendance/location', ac)).json();
ok(own.proofs.length === 1 && other.proofs.length === 0, 'a lawyer reads only their own');
ok(all.scope === 'all' || all.proofs !== undefined, 'senior read endpoint responds');
await done('attendance-location');
