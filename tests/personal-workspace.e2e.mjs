// Part 1 group A: items 69, 70, 72, 73, 75, 77, 78, 79, 88.
import { db, ok, q, insertDummy, adminCookie, lawyerCookie, api, done } from './helpers.mjs';
await db.connect();
const t = 'pw' + Date.now();
await insertDummy('lawyers', { id: t + 'law', fullName: 'Pia Tester', email: t + '@example.test', slug: t + 'slug', approvedAt: new Date(), active: true });
const lc = await lawyerCookie('Pia Tester', t + '@example.test'), ac = await adminCookie();
const j = async (r) => ({ s: r.status, b: await r.json().catch(() => ({})) });
const put = (c, key, value) => api('/api/me/prefs', c, { method: 'PUT', body: JSON.stringify({ key, value }) }).then(j);
// prefs
ok((await put(lc, 'theme', 'dark')).s === 200, 'lawyer saves theme=dark');
ok((await put(lc, 'theme', 'purple')).s === 400, 'invalid theme rejected');
ok((await put(lc, 'fontScale', 5)).s === 400, 'font scale out of range rejected');
ok((await put(lc, 'fontScale', 1.2)).s === 200, 'font scale 1.2 saved');
ok((await put(lc, 'columns', { sessions: ['date', 'place'] })).s === 200, 'column preferences saved');
ok((await put(lc, 'quickActions', ['new-session', 'search'])).s === 200, 'quick actions saved');
ok((await put(lc, 'layout', { widgets: ['today', 'recent'] })).s === 200, 'workspace layout saved');
ok((await put(lc, 'evil', 1)).s === 400, 'unknown pref key rejected');
ok((await j(await api('/api/me/prefs', lc))).b.prefs?.theme === 'dark', 'lawyer reads own prefs');
ok(!(await j(await api('/api/me/prefs', ac))).b.prefs?.theme, 'admin does NOT see the lawyer prefs');
ok((await api('/api/me/prefs')).status === 401, 'anonymous prefs refused');
// recents and favorites
const item = (i, kind = 'RECENT', href = '/cases/' + i) => api('/api/me/items', lc, { method: 'POST', body: JSON.stringify({ kind, itemType: 'case', itemId: 'c' + i, label: 'Case ' + i, href }) }).then(j);
for (let i = 0; i < 35; i++) await item(i);
ok((await item(99, 'FAVORITE')).s === 201, 'favorite added');
ok((await item(98, 'RECENT', '//evil.example')).s === 400, 'external link refused');
const items = (await j(await api('/api/me/items', lc))).b.items;
ok(items.filter(x => x.kind === 'RECENT').length === 30, 'recents capped at 30 (got ' + items.filter(x => x.kind === 'RECENT').length + ')');
ok(items.some(x => x.kind === 'FAVORITE'), 'favorite kept');
ok(((await j(await api('/api/me/items', ac))).b.items || []).length === 0, 'admin sees none of the lawyer items');
const fid = items.find(x => x.kind === 'FAVORITE').id;
ok((await j(await api('/api/me/items', ac, { method: 'DELETE', body: JSON.stringify({ id: fid }) }))).s === 200 && (await q(`SELECT 1 FROM office_recent_items WHERE id=$1`, [fid])).length === 1, 'another user cannot delete my item');
// saved filters
ok((await api('/api/me/filters', lc, { method: 'POST', body: JSON.stringify({ scope: 'sessions', name: 'Mine', filter: { status: 'PENDING' } }) })).status === 201, 'filter saved');
ok((await api('/api/me/filters', lc, { method: 'POST', body: JSON.stringify({ scope: 'sessions', name: 'Mine', filter: { status: 'DONE' } }) })).status === 201, 'same name updates');
const fl = (await j(await api('/api/me/filters?scope=sessions', lc))).b.filters;
ok(fl.length === 1 && fl[0].filter.status === 'DONE', 'one filter, updated');
ok((await j(await api('/api/me/filters', ac))).b.filters.length === 0, 'admin does not see it');
// drafts
const dr = (data) => api('/api/me/drafts', lc, { method: 'POST', body: JSON.stringify({ formKey: 'client.new', recordRef: 'r1', data }) }).then(j);
for (let i = 1; i <= 23; i++) await dr({ name: 'v' + i });
const vs = (await j(await api('/api/me/drafts?formKey=client.new&recordRef=r1', lc))).b.versions;
ok(vs.length === 20 && vs[0].version === 23 && vs[0].data.name === 'v23', 'drafts keep latest 20 versions, newest first');
ok((await j(await api('/api/me/drafts?formKey=client.new&recordRef=r1', ac))).b.versions.length === 0, 'admin cannot read my drafts');
await api('/api/me/drafts', lc, { method: 'DELETE', body: JSON.stringify({ formKey: 'client.new', recordRef: 'r1' }) });
ok((await j(await api('/api/me/drafts?formKey=client.new&recordRef=r1', lc))).b.versions.length === 0, 'drafts cleared');
// undo
await insertDummy('locations', { id: t + 'loc' });
await insertDummy('tasks', { id: t + 'task', locationId: t + 'loc', description: 'Original text', status: 'PENDING' });
const patch = await api('/api/tasks/' + t + 'task', ac, { method: 'PATCH', body: JSON.stringify({ description: 'Changed text' }) });
ok(patch.status === 200, 'admin edits task (' + patch.status + ')');
ok((await q(`SELECT description FROM tasks WHERE id=$1`, [t + 'task']))[0].description === 'Changed text', 'task changed');
const ul = (await j(await api('/api/me/undo', ac))).b.entries.filter(e => e.resourceId === t + 'task');
ok(ul.length === 1, 'undo entry recorded');
ok((await j(await api('/api/me/undo', lc, { method: 'POST', body: JSON.stringify({ id: ul[0].id }) }))).s === 404, "another user cannot undo my change");
ok((await api('/api/me/undo', ac, { method: 'POST', body: JSON.stringify({ id: ul[0].id }) })).status === 200, 'owner undoes');
ok((await q(`SELECT description FROM tasks WHERE id=$1`, [t + 'task']))[0].description === 'Original text', 'task restored');
ok((await api('/api/me/undo', ac, { method: 'POST', body: JSON.stringify({ id: ul[0].id }) })).status === 404, 'cannot undo twice');
await q(`UPDATE office_undo_log SET expires_at=NOW()-interval '1 minute'`);
ok((await j(await api('/api/me/undo', ac))).b.entries.filter(e => e.resourceId === t + 'task').length === 0, 'expired entries hidden');
await done('personal-workspace');
