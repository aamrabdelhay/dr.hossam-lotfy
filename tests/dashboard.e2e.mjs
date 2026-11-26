// Part 4 item 211: senior dashboard counts. Synthetic data only.
import { db, ok, q, insertDummy, adminCookie, lawyerCookie, api, done } from './helpers.mjs';
await db.connect();
const t = 'db' + Date.now(); const ac = await adminCookie();
await insertDummy('lawyers', { id: t + 'p', fullName: 'DB Plain', email: t + 'p@example.test', slug: t + 'ps', approvedAt: new Date(), active: true });
const pc = await lawyerCookie('DB Plain', t + 'p@example.test');
const base = (await (await api('/api/admin/dashboard', ac)).json()).counts;
await insertDummy('case_records', { id: t + 'c', name: 'DB ' + t, number: 'DB' + t });
await insertDummy('case_records', { id: t + 'w', name: 'DBW ' + t, number: 'DBW' + t });
await insertDummy('office_case_security', { id: t + 'sec', case_id: t + 'w', classification: 'INTERNAL', ethical_wall_enabled: true });
const after = (await (await api('/api/admin/dashboard', ac)).json()).counts;
ok(after.cases === base.cases + 1, 'walled case not counted, normal case counted');
ok((await api('/api/admin/dashboard', pc)).status === 403, 'non-senior refused');
await done('dashboard');
