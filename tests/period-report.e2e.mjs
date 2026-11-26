// Part 4 items 212/213: period report. Synthetic data only.
import { db, ok, q, insertDummy, adminCookie, lawyerCookie, api, done } from './helpers.mjs';
await db.connect();
const t = 'pr' + Date.now();
const ac = await adminCookie();
await insertDummy('lawyers', { id: t + 'p', fullName: 'PR Plain', email: t + 'p@example.test', slug: t + 'ps', approvedAt: new Date(), active: true });
const pc = await lawyerCookie('PR Plain', t + 'p@example.test');
await insertDummy('case_records', { id: t + 'c', name: 'PR ' + t, number: 'PR' + t, branch_id: 'branch_main' });
await insertDummy('case_records', { id: t + 'w', name: 'PRW ' + t, number: 'PW' + t, branch_id: 'branch_main' });
await insertDummy('office_case_security', { id: t + 'sec', case_id: t + 'w', classification: 'INTERNAL', ethical_wall_enabled: true });
await insertDummy('locations', { id: t + 'l', name: 'محكمة تقرير', type: 'COURT' });
await q(`INSERT INTO case_finance_entries (id, case_id, kind, amount, created_at) VALUES ($1,$2,'INVOICE',700,'2031-03-10'),($3,$2,'PAYMENT',300,'2031-04-05'),($4,$5,'INVOICE',9999,'2031-03-11')`, ['f1' + t, t + 'c', 'f2' + t, 'f3' + t, t + 'w']);
for (const [id, c, status, created, done_] of [['a', 'c', 'COMPLETED', '2031-03-02', '2031-03-20'], ['b', 'c', 'COMPLETED', '2031-03-03', '2031-04-02'], ['c', 'w', 'COMPLETED', '2031-03-03', '2031-03-21']]) {
  await insertDummy('tasks', { id: t + id, locationId: t + 'l', caseId: t + c, description: 'مهمة تقرير', scheduledDate: '2031-03-01', status, createdAt: created, completedAt: done_ });
}
ok((await api('/api/admin/reports/period?from=2031-03&to=2031-04', pc)).status === 403, 'plain lawyer refused');
ok((await api('/api/admin/reports/period?from=2031-04&to=2031-03', ac)).status === 400, 'reversed period refused');
const r = await (await api('/api/admin/reports/period?from=2031-03&to=2031-04', ac)).json();
const m = r.rows.find((x) => x.month === '2031-03' && x.branch === 'branch_main'); const a = r.rows.find((x) => x.month === '2031-04' && x.branch === 'branch_main');
ok(m && m.tasksCreated === 2 && m.tasksCompleted === 1, 'March: walled case task not counted (2 created, 1 completed)');
ok(a && a.tasksCompleted === 1 && a.tasksCompletedDelta === 0, 'April completed 1, change 0');
ok(m.invoiced === 700 && a.received === 300, 'finance columns for finance management; walled invoice excluded');
const x = Buffer.from(await (await api('/api/admin/reports/period?from=2031-03&to=2031-04&format=xlsx', ac)).arrayBuffer()); ok(x.subarray(0, 2).toString() === 'PK', 'xlsx export');
ok(r.notes.length === 2, 'notes state the limits');
await done('period-report');
