// Part 4 item 216: funnel counts from real tables. Synthetic data only.
import { db, ok, q, insertDummy, adminCookie, lawyerCookie, api, done } from './helpers.mjs';
await db.connect();
const t = 'cj' + Date.now(); const ac = await adminCookie();
await insertDummy('lawyers', { id: t + 'p', fullName: 'CJ Plain', email: t + 'p@example.test', slug: t + 'ps', approvedAt: new Date(), active: true });
const pc = await lawyerCookie('CJ Plain', t + 'p@example.test');
const base = await (await api('/api/admin/reports/client-journey', ac)).json();
for (const k of ['a', 'b']) await insertDummy('clients', { id: t + k, name: 'عميل تجريبي ' + k });
await q(`INSERT INTO client_appointments (id, client_id, source_submission_id, appointment_date, appointment_time, appointment_type, status) VALUES ($1,$2,$3,CURRENT_DATE,'10:00','consult','PENDING'),($4,$5,$6,CURRENT_DATE,'11:00','consult','CONFIRMED')`, [t + 'x', t + 'a', t + 'sa', t + 'y', t + 'b', t + 'sb']);
await insertDummy('case_records', { id: t + 'c', name: 'CJ', number: 'CJ' + t, clientId: t + 'b' });
const r = await (await api('/api/admin/reports/client-journey', ac)).json();
ok(r.stages.requested === base.stages.requested + 2 && r.stages.confirmed === base.stages.confirmed + 1 && r.stages.hasCase === base.stages.hasCase + 1, 'funnel moves by the seeded clients');
ok(r.limits.includes('لا يوجد في النظام حقل لمصدر العميل'), 'states lead source is not recorded');
ok((await api('/api/admin/reports/client-journey', pc)).status === 403, 'non-senior refused');
await done('client-journey');
