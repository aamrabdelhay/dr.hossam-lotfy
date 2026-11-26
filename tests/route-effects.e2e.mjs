// Route-level effects of walls and branch limits on EXISTING routes (feed, task routes, client routes), for 5 actors.
// Actors: senior admin (code login), senior-list lawyer, lawyer branch-A office manager, ACCOUNT branch-A office manager (synthetic signed session, no Google), unprivileged lawyer.
import { db, ok, q, insertDummy, adminCookie, lawyerCookie, accountCookie, api, done } from './helpers.mjs';
await db.connect();
const t = 're' + Date.now(), A = 'brA' + t, B = 'brB' + t, C = 'brC' + t, W = 'Zre' + t;
const ac = await adminCookie();
const lawyer = async (k, role) => { await insertDummy('lawyers', { id: t + k, fullName: 'Person ' + k, email: t + k + '@example.test', slug: t + k + 's', approvedAt: new Date(), active: true }); if (role) await insertDummy('users', { id: t + k + 'u', email: t + k + '@example.test', name: 'Person ' + k, role }); return lawyerCookie('Person ' + k, t + k + '@example.test'); };
const plain = await lawyer('x'); const sen = await lawyer('sen'); await insertDummy('office_senior_members', { id: t + 'sm', lawyer_id: t + 'sen' });
const mgr = await lawyer('mgr', 'OFFICE_MANAGER'); await insertDummy('office_branch_managers', { id: t + 'bm', branch_id: A, manager_type: 'OFFICE_MANAGER', lawyer_id: t + 'mgr' });
await insertDummy('users', { id: t + 'acct', email: t + 'acct@example.test', name: 'Acct Mgr', role: 'OFFICE_MANAGER' });
await insertDummy('office_branch_managers', { id: t + 'bm2', branch_id: C, manager_type: 'OFFICE_MANAGER', user_id: t + 'acct' });
const acct = await accountCookie(t + 'acct', 'OFFICE_MANAGER');
ok((await (await api('/api/auth/me', acct)).json()).user?.userRole === 'OFFICE_MANAGER', 'synthetic ACCOUNT office-manager session is accepted by the app');
await insertDummy('locations', { id: t + 'loc' });
for (const [k, br, cls, wall] of [['a', A, 'INTERNAL', false], ['c', C, 'INTERNAL', false], ['b', B, 'INTERNAL', false], ['wall', A, 'INTERNAL', true], ['hc', A, 'HIGHLY_CONFIDENTIAL', false]]) {
  await insertDummy('case_records', { id: t + k, name: 'Case ' + W + k, number: 'N' + k, branch_id: br });
  await insertDummy('office_case_security', { id: t + k + 'sec', case_id: t + k, classification: cls, ethical_wall_enabled: wall });
  await insertDummy('tasks', { id: t + k + 'task', locationId: t + 'loc', caseId: t + k, description: 'Hearing ' + W + k, branch_id: br });
}
await insertDummy('tasks', { id: t + 'nocase', locationId: t + 'loc', description: 'General ' + W + 'nocase', branch_id: C });
await insertDummy('clients', { id: t + 'ca', name: 'Client A ' + W, phone: '0100' + String(Date.now()).slice(-7), branch_id: A });
await insertDummy('clients', { id: t + 'cc', name: 'Client C ' + W, phone: '0102' + String(Date.now()).slice(-7), branch_id: C });
await insertDummy('clients', { id: t + 'cb', name: 'Client B ' + W, phone: '0101' + String(Date.now()).slice(-7), branch_id: B });
const actors = { 'senior admin': ac, 'senior lawyer': sen, 'lawyer office manager A': mgr, 'account office manager C': acct, 'unprivileged lawyer': plain };
const feed = async (c) => ((await (await api('/api/tasks?limit=100&q=' + encodeURIComponent(W), c)).json()).items || []).map(i => i.description.replace('Hearing ' + W, '').replace('General ' + W, '')).sort().join(',');
const home = { 'senior admin': 'a,b,c,hc,nocase,wall', 'senior lawyer': 'a,b,c,hc,nocase,wall', 'lawyer office manager A': 'a', 'account office manager C': 'c,nocase', 'unprivileged lawyer': 'a,b,nocase' };
for (const [n, c] of Object.entries(actors)) { const f = await feed(c); const s = f.split(',').filter(x => x && !['a','b','c','nocase'].includes(x)); ok(!(n !== 'senior admin' && n !== 'senior lawyer' && s.length), `${n}: feed hides walled and highly confidential sessions (got [${f}])`); if (n !== 'unprivileged lawyer') ok(f === home[n], `${n}: feed shows exactly the permitted sessions [${home[n]}] (got [${f}])`); }
ok((await feed(sen)) === home['senior lawyer'] && (await feed(ac)) === home['senior admin'], 'seniors see walled and HC sessions in the feed');
// task routes on walled task
const code = async (path, c, method, body) => (await api(path, c, { method, body: body ? JSON.stringify(body) : undefined })).status;
for (const n of ['unprivileged lawyer', 'lawyer office manager A', 'account office manager C']) {
  const c = actors[n];
  ok(await code('/api/tasks/' + t + 'walltask/comments', c, 'POST', { text: 'hi' }) === 404, `${n}: comment on walled task is 404`);
  ok(await code('/api/tasks/' + t + 'walltask', c, 'PATCH', { description: 'hack' }) === 404, `${n}: edit walled task is 404`);
  ok(await code('/api/tasks/' + t + 'walltask/confirm', c, 'POST') === 404, `${n}: confirm walled task is 404`);
  ok(await code('/api/tasks/' + t + 'walltask/outcome', c, 'GET') === 404, `${n}: outcome of walled task is 404`);
  ok(await code('/api/tasks/' + t + 'hctask/complete', c, 'POST') === 404, `${n}: complete HC task is 404`);
}
ok((await q(`SELECT description FROM tasks WHERE id=$1`, [t + 'walltask']))[0].description === 'Hearing ' + W + 'wall', 'walled task unchanged');
ok(await code('/api/tasks/' + t + 'walltask/outcome', ac, 'GET') !== 404, 'senior admin can still reach walled task routes');
// clients
const put = (id, c) => code('/api/clients/' + id, c, 'PUT', { name: 'Renamed ' + id });
ok(await put(t + 'cb', mgr) === 403, 'lawyer office manager A cannot edit a branch B client');
ok(await put(t + 'cb', acct) === 403 && await put(t + 'ca', acct) === 403, 'account office manager C cannot edit clients of branch A or B');
ok(await put(t + 'cc', acct) === 200, 'account office manager C can edit a branch C client');
ok(await put(t + 'ca', mgr) === 200, 'lawyer office manager A can edit a branch A client');
ok(await put(t + 'cb', plain) === 403, 'unprivileged lawyer cannot edit a client');
ok(await put(t + 'cb', ac) === 200, 'senior admin can edit any client');
const link = (cid, kid, c) => code('/api/clients/' + cid + '/cases', c, 'POST', { caseId: kid });
ok(await link(t + 'cb', t + 'c', acct) === 403, 'account manager C cannot link a case to a branch B client');
ok(await link(t + 'cc', t + 'b', acct) === 404, 'account manager C cannot link a branch B case');
ok(await link(t + 'cc', t + 'wall', acct) === 404, 'account manager C cannot link a walled case');
ok(await link(t + 'cc', t + 'c', acct) === 200, 'account manager C can link a branch C case to a branch C client');
// search for the account manager (existing matrix, new actor)
const srch = async (c) => ((await (await api('/api/search?q=' + encodeURIComponent(W), c)).json()).sessions || []).map(s => s.description.replace('Hearing ' + W, '').replace('General ' + W, '')).sort().join(',');
ok(await srch(acct) === 'c,nocase', 'account office manager C: search sessions = [c,nocase] (got [' + await srch(acct) + '])');
// activity feed and calendar page
await insertDummy('activity_logs', { id: t + 'act1', action: 'x', summary: 'Act ' + W + 'wall', taskId: t + 'walltask' });
await insertDummy('activity_logs', { id: t + 'act2', action: 'x', summary: 'Act ' + W + 'open', taskId: t + 'atask' });
for (const [n, c] of Object.entries(actors)) {
  const r = await api('/api/activity', c); const sums = ((await r.json()).activity || []).map(a => a.summary);
  const sawWall = sums.includes('Act ' + W + 'wall');
  ok(n === 'senior admin' ? sawWall : !sawWall, `${n}: activity feed ${n === 'senior admin' ? 'shows' : 'hides'} walled-task activity (senior lawyer has no admin API session: status ${r.status}, pending review)`);
}
await done('route-effects');
