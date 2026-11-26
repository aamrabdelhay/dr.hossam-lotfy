// Item 8: opening a case page writes one VIEW audit row per person per 10 minutes. Synthetic data only.
import { db, ok, q, insertDummy, adminCookie, lawyerCookie, api, done } from './helpers.mjs';
await db.connect();
const t = 'zv' + Date.now();
await insertDummy('case_records', { id: t + 'c', name: 'Case ' + t, number: 'N' + t });
const ac = await adminCookie();
const r1 = await api('/cases/' + t + 'c', ac); ok(r1.status === 200, 'senior admin opens the case page (status ' + r1.status + ')');
await api('/cases/' + t + 'c', ac);
const rows = await q(`SELECT count(*)::int AS n FROM office_audit_events WHERE action='VIEW' AND resource_type='case' AND resource_id=$1`, [t + 'c']);
ok(rows[0].n === 1, 'two opens in 10 minutes give one VIEW row (got ' + rows[0].n + ')');
const none = await api('/cases/' + t + 'nope', ac);
const rows2 = await q(`SELECT count(*)::int AS n FROM office_audit_events WHERE action='VIEW' AND resource_id=$1`, [t + 'nope']);
ok(rows2[0].n === 0, 'a missing case writes no VIEW row (status ' + none.status + ')');
await done('view-audit');
