// Part 3 items 166-169, 171, 189: office analytics. Senior only. Synthetic data only.
import { db, ok, q, insertDummy, adminCookie, lawyerCookie, api, done } from './helpers.mjs';
await db.connect();
const t = 'an' + Date.now();
const call = (p, c) => api(p, c, {});
const ac = await adminCookie();
await insertDummy('lawyers', { id: t + 'l', fullName: 'AN L ' + t, email: t + 'l@example.test', slug: t + 'ls', approvedAt: new Date(), active: true });
const lc = await lawyerCookie('AN L ' + t, t + 'l@example.test');
ok((await call('/api/admin/analytics', null)).status >= 401, 'anonymous refused');
ok((await call('/api/admin/analytics', lc)).status === 403, 'a plain lawyer is refused');
const loc = (await q(`SELECT id FROM locations LIMIT 1`))[0];
let locId = loc?.id; if (!locId) { locId = t + 'loc'; await insertDummy('locations', { id: locId, name: 'L ' + t, slug: t + 'lc' }); }
await insertDummy('case_records', { id: t + 'c', name: 'AN case ' + t, number: 'N' + t });
for (let i = 0; i < 3; i++) {
  await insertDummy('tasks', { id: t + 't' + i, locationId: locId, caseId: t + 'c', description: 'task ' + i, scheduledDate: i === 0 ? '2020-01-01' : '2099-01-01', status: 'PENDING', updatedAt: new Date('2020-01-01') });
  await insertDummy('task_assignments', { id: t + 'a' + i, taskId: t + 't' + i, lawyerId: t + 'l' });
}
const d = await (await call('/api/admin/analytics?capacity=4&extra=2&staleDays=30', ac)).json();
const me = d.workload.find((x) => x.id === t + 'l');
ok(me && me.open === 3 && me.overdue === 1 && me.loadPercent === 75 && !me.overCapacity, 'workload counts open, overdue and load percent');
ok(d.simulation && d.simulation.result.find((x) => x.id === t + 'l').after >= 3, 'simulation returns projected loads');
ok(d.health.overdue_tasks >= 1 && Array.isArray(d.branches) && Array.isArray(d.bottlenecks.byStatus), 'health, branches and bottlenecks present');
ok(d.bottlenecks.byStatus.reduce((a, b) => a + b.stale, 0) >= 0 && d.notice.length > 10, 'notice states the limits');
const d2 = await (await call('/api/admin/analytics?capacity=2', ac)).json();
ok(d2.workload.find((x) => x.id === t + 'l').overCapacity === true && d2.simulation === null, 'over capacity flagged; no simulation unless asked');
ok(!JSON.stringify(d).includes('AN case'), 'no case names in analytics');
await done('analytics');
