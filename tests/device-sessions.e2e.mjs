// Item 7 verification: list own sessions, end another device remotely, cannot touch someone else's. Synthetic users.
import { db, ok, insertDummy, lawyerCookie, api, done } from './helpers.mjs';
await db.connect();
const t = 'ds' + Date.now();
for (const k of ['a', 'b']) await insertDummy('lawyers', { id: t + k, fullName: 'Dev ' + k, email: t + k + '@example.test', slug: t + k + 's', approvedAt: new Date(), active: true });
const a1 = await lawyerCookie('Dev a', t + 'a@example.test'), a2 = await lawyerCookie('Dev a', t + 'a@example.test'), b1 = await lawyerCookie('Dev b', t + 'b@example.test');
const list = async (c) => (await (await api('/api/auth/sessions', c)).json()).sessions || [];
const la = await list(a1);
ok(la.length === 2 && la.filter((s) => s.current).length === 1, 'user sees exactly own 2 sessions, one marked current (' + la.length + ')');
const other = la.find((s) => !s.current);
const del = (c, id) => api('/api/auth/sessions', c, { method: 'DELETE', body: JSON.stringify({ sessionId: id }) });
ok((await del(b1, other.id)).status === 404, "another user cannot end my session");
ok((await del(a1, la.find((s) => s.current).id)).status === 400, 'cannot end the current session from the list');
ok((await del(a1, other.id)).status === 200, 'user ends the other device');
ok((await api('/api/auth/me', a2)).status === 401 || !(await (await api('/api/auth/me', a2)).json()).user, 'the ended device is logged out');
ok((await api('/api/auth/me', a1)).status === 200, 'current device stays logged in');
ok((await api('/api/auth/sessions')).status === 401, 'anonymous refused');
await done('device-sessions');
