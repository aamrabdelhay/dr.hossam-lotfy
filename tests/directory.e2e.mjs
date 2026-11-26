// Part 3 item 185: directory. Everyone signed in reads; senior and office managers write; deactivate not delete.
import { db, ok, q, insertDummy, adminCookie, lawyerCookie, api, done } from './helpers.mjs';
await db.connect();
const t = 'dr' + Date.now();
const call = (p, c, m = 'GET', b) => api(p, c, { method: m, ...(b ? { body: JSON.stringify(b) } : {}) });
const ac = await adminCookie();
await insertDummy('lawyers', { id: t + 'p', fullName: 'DR P', email: t + 'p@example.test', slug: t + 'ps', approvedAt: new Date(), active: true });
const pc = await lawyerCookie('DR P', t + 'p@example.test');
ok((await call('/api/directory', null)).status >= 401, 'anonymous refused');
ok((await call('/api/directory', pc, 'POST', { kind: 'EXPERT', name: 'خبير ' + t })).status === 403, 'a plain lawyer cannot add');
const r = await call('/api/directory', ac, 'POST', { kind: 'EXPERT', name: 'خبير ' + t, specialty: 'خبير حسابي', phone: '0100000000' });
const id = (await r.json()).id; ok(r.status === 201 && id, 'senior adds an expert');
ok((await call('/api/directory', ac, 'POST', { kind: 'PROVIDER', name: 'x', email: 'bad' })).status === 400, 'bad input rejected');
const l = (await (await call('/api/directory?kind=EXPERT', pc)).json()).entries; ok(l.some((e) => e.id === id), 'a plain lawyer can read the directory');
ok((await call('/api/directory', pc, 'PATCH', { id, active: false })).status === 403, 'a plain lawyer cannot deactivate');
ok((await call('/api/directory', ac, 'PATCH', { id, active: false })).status === 200, 'senior deactivates');
ok(!(await (await call('/api/directory', pc)).json()).entries.some((e) => e.id === id) && (await q(`SELECT 1 FROM office_directory WHERE id=$1`, [id])).length === 1, 'hidden from the list but the row is kept');
await done('directory');
