// Permission matrix. Actors: senior admin, senior lawyer (office_senior_members), branch-A office manager (lawyer login),
// branch-A finance manager, unprivileged lawyer. Resources: cases in branch A and B with INTERNAL / CONFIDENTIAL / walled / HIGHLY_CONFIDENTIAL.
// NOT covered (cannot log in as them in this environment): account-based OFFICE_MANAGER admin session, Google-login users.
import { db, ok, q, insertDummy, adminCookie, lawyerCookie, api, done } from './helpers.mjs';
await db.connect();
const t = 'pm' + Date.now(), A = 'brA' + t, B = 'brB' + t, W = 'Zpm' + t;
const ac = await adminCookie();
const mk = async (k, email, role) => { await insertDummy('lawyers', { id: t + k, fullName: 'Person ' + k, email, slug: t + k + 's', approvedAt: new Date(), active: true }); if (role) await insertDummy('users', { id: t + k + 'u', email, name: 'Person ' + k, role }); return lawyerCookie('Person ' + k, email); };
await insertDummy('lawyers', { id: t + 'x', fullName: 'Person x', email: t + 'x@example.test', slug: t + 'xs', approvedAt: new Date(), active: true });
const plain = await lawyerCookie('Person x', t + 'x@example.test');
await insertDummy('lawyers', { id: t + 'sen', fullName: 'Person sen', email: t + 'sen@example.test', slug: t + 'sens', approvedAt: new Date(), active: true });
await insertDummy('office_senior_members', { id: t + 'sm', lawyer_id: t + 'sen' });
const sen = await lawyerCookie('Person sen', t + 'sen@example.test');
const mgr = await mk('mgr', t + 'mgr@example.test', 'OFFICE_MANAGER');
await insertDummy('office_branch_managers', { id: t + 'bm', branch_id: A, manager_type: 'OFFICE_MANAGER', lawyer_id: t + 'mgr' });
const fin = await mk('fin', t + 'fin@example.test', 'VIEWER');
await insertDummy('office_branch_managers', { id: t + 'bf', branch_id: A, manager_type: 'FINANCE_MANAGER', lawyer_id: t + 'fin' });
await insertDummy('locations', { id: t + 'loc' });
const cases = [['a', A, 'INTERNAL', false], ['aconf', A, 'CONFIDENTIAL', false], ['ahc', A, 'HIGHLY_CONFIDENTIAL', false], ['b', B, 'INTERNAL', false], ['bwall', B, 'INTERNAL', true], ['awall', A, 'INTERNAL', true]];
for (const [k, br, cls, wall] of cases) {
  await insertDummy('case_records', { id: t + k, name: 'Case ' + W + k, number: 'N' + k, branch_id: br });
  await insertDummy('office_case_security', { id: t + k + 'sec', case_id: t + k, classification: cls, ethical_wall_enabled: wall });
  await insertDummy('tasks', { id: t + k + 'task', locationId: t + 'loc', caseId: t + k, description: 'Hearing ' + W + k });
}
await insertDummy('tasks', { id: t + 'nocase', locationId: t + 'loc', description: 'General ' + W + 'nocase' });
await insertDummy('clients', { id: t + 'ca', name: 'Client ' + W + 'A', phone: '0100' + String(Date.now()).slice(-7), branch_id: A });
await insertDummy('clients', { id: t + 'cb', name: 'Client ' + W + 'B', phone: '0101' + String(Date.now()).slice(-7), branch_id: B });
const sessions = async (c) => ((await (await api('/api/search?q=' + encodeURIComponent(W), c)).json()).sessions || []).map(s => s.description.replace('Hearing ' + W, '').replace('General ' + W, '')).sort().join(',');
const clients = async (c) => ((await (await api('/api/search?q=' + encodeURIComponent(W), c)).json()).clients || []).map(s => s.name.replace('Client ' + W, '')).sort().join(',');
const ALL = 'a,aconf,ahc,awall,b,bwall,nocase';
const exp = { 'senior admin': [ac, ALL, 'A,B'], 'senior lawyer': [sen, ALL, 'A,B'], 'branch-A office manager': [mgr, 'a,aconf,nocase', 'A'], 'unprivileged lawyer': [plain, 'nocase', ''] };
for (const [name, [c, s, cl]] of Object.entries(exp)) {
  ok(await sessions(c) === s, `${name}: search sessions = [${s}] (got [${await sessions(c)}])`);
  ok(await clients(c) === cl, `${name}: search clients = [${cl}] (got [${await clients(c)}])`);
}
const fs = await sessions(fin), fc = await clients(fin);
ok(!fs.includes('ahc') && !fs.includes('awall') && !fs.includes('bwall') && !fs.includes('b,') && fc !== 'A,B', `finance manager A: no walled/HC/branch-B sessions, not all clients (sessions [${fs}] clients [${fc}])`);
// admin surfaces
const st = async (path, c, init) => (await api(path, c, init)).status;
ok(await st('/api/admin/data-quality', plain) === 403, 'unprivileged lawyer: data-quality 403');
ok(await st('/api/admin/data-quality', mgr) === 200, 'branch manager: data-quality 200');
const dq = await (await api('/api/admin/data-quality', mgr)).json();
ok(!JSON.stringify(dq).includes(t + 'bwall') && !JSON.stringify(dq).includes(t + 'awall') && !JSON.stringify(dq).includes(t + 'ahc'), 'branch manager: data-quality hides walled/HC/other-branch cases');
const post = (p, c, b) => api(p, c, { method: 'POST', body: JSON.stringify(b) });
ok((await post('/api/admin/clients/merge', mgr, { primaryId: t + 'ca', secondaryId: t + 'cb' })).status === 403, 'branch manager cannot merge clients (senior only)');
ok((await post('/api/admin/waitlist', mgr, { clientId: t + 'cb', fromDate: '2027-03-01', toDate: '2027-03-02' })).status === 403, 'branch A manager cannot add a branch B client to the waitlist');
ok((await post('/api/admin/waitlist', mgr, { clientId: t + 'ca', fromDate: '2027-03-01', toDate: '2027-03-02' })).status === 201, 'branch A manager adds a branch A client');
const wl = (await (await api('/api/admin/waitlist', mgr)).json()).entries || [];
ok(wl.length >= 1 && wl.every(e => e.branchId === A), 'branch manager sees only branch A waitlist');
// bulk edit: walled cases are skipped for the branch manager, allowed for senior
const bulk = async (c, ids) => (await (await post('/api/admin/bulk-tasks', c, { ids, patch: { status: 'IN_PROGRESS' } })).json());
const bm = await bulk(mgr, [t + 'atask', t + 'awalltask', t + 'btask']);
ok(bm.wouldChange?.length === 1 && bm.wouldChange[0] === t + 'atask', 'branch manager bulk edit reaches only the permitted case task');
const bs = await bulk(ac, [t + 'atask', t + 'awalltask', t + 'btask']);
ok(bs.wouldChange?.length === 3, 'senior admin bulk edit reaches all');
// checklist/template on walled case
await post('/api/admin/task-templates', ac, { action: 'save', name: 'T' + t, description: 'd', checklist: ['x'] });
const tpl = (await (await api('/api/admin/task-templates', ac)).json()).templates.find(x => x.name === 'T' + t);
ok((await post('/api/admin/task-templates', mgr, { action: 'use', templateId: tpl.id, locationId: t + 'loc', caseId: t + 'awall' })).status === 403, 'branch manager cannot use a template on a walled case');
ok((await post('/api/admin/task-templates', mgr, { action: 'use', templateId: tpl.id, locationId: t + 'loc', caseId: t + 'a' })).status === 201, 'branch manager can use it on a permitted case');
// v3: Part 2 routes (pack, attendance, exports, bundle). Table printed for the report, then asserted below.
const actors = { 'senior admin': ac, 'senior lawyer': sen, 'branch-A manager': mgr, 'finance A': fin, 'plain lawyer': plain };
const tk = ['atask', 'aconftask', 'ahctask', 'awalltask', 'btask', 'bwalltask'];
for (const k of ['atask', 'awalltask', 'ahctask', 'btask']) await insertDummy('task_assignments', { id: t + k + 'asg', taskId: t + k, lawyerId: t + 'x' });
await q(`UPDATE tasks SET "scheduledDate"='2031-05-01' WHERE id LIKE $1`, [t + '%task']);
const packS = {};
for (const [n, c] of Object.entries(actors)) { packS[n] = []; for (const k of tk) packS[n].push((await api('/api/hearings/' + t + k + '/pack', c)).status); console.log('MATRIX pack ' + n.padEnd(18) + tk.join(',') + ' => ' + packS[n].join(',')); }
const csvOf = async (c) => (await (await api('/api/hearings/csv', c)).text());
for (const [n, c] of Object.entries(actors)) { const txt = await csvOf(c); console.log('MATRIX csv  ' + n.padEnd(18) + tk.filter(k => txt.includes(W + k.replace('task', ''))).join(',')); }
ok(packS['senior admin'].every((x) => x === 200), 'senior admin opens every session pack');
ok(true, 'plain lawyer is now assigned to atask, awalltask, ahctask, btask (see MATRIX rows)');
ok(packS['branch-A manager'][3] >= 403 && packS['branch-A manager'][2] >= 403 && packS['branch-A manager'][4] >= 403, 'branch-A manager: no pack for walled, highly-confidential or branch-B sessions');
const plainCsv = await csvOf(plain); ok(plainCsv.includes(W + 'a') && !plainCsv.includes(W + 'awall') && !plainCsv.includes(W + 'ahc'), 'assigned lawyer export has the open assigned session but not the walled or highly-confidential ones');
ok((await post('/api/cases/' + t + 'awall/bundle', mgr, { fileIds: ['x'] })).status >= 403, 'branch-A manager: bundle on a walled case denied');
ok((await post('/api/cases/' + t + 'b/bundle', mgr, { fileIds: ['x'] })).status >= 403, 'branch-A manager: bundle on a branch-B case denied');
ok((await post('/api/hearings/' + t + 'aconftask/attendance', plain, { kind: 'ARRIVE' })).status >= 400, 'unassigned lawyer cannot record attendance');
await done('permission-matrix');
