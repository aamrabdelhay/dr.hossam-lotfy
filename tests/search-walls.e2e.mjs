// Items 1, 4, 5, 71: search must not reveal sessions of walled or highly confidential cases.
import { db, ok, q, insertDummy, adminCookie, lawyerCookie, api, done } from './helpers.mjs';
await db.connect();
const t = 'zs' + Date.now(), word = 'Zqxwalled' + t;
await insertDummy('lawyers', { id: t + 'law', fullName: 'Zed Tester', email: t + '@example.test', slug: t + 'slug', approvedAt: new Date(), active: true });
await insertDummy('locations', { id: t + 'loc' });
for (const [suffix, wall, cls] of [['wall', true, 'INTERNAL'], ['hc', false, 'HIGHLY_CONFIDENTIAL'], ['open', false, 'INTERNAL']]) {
  await insertDummy('case_records', { id: t + suffix, name: 'Case ' + word + suffix, number: 'N' + suffix });
  await insertDummy('office_case_security', { id: t + suffix + 'sec', case_id: t + suffix, classification: cls, ethical_wall_enabled: wall });
  await insertDummy('tasks', { id: t + suffix + 'task', locationId: t + 'loc', caseId: t + suffix, description: 'Hearing ' + word + suffix });
}
await insertDummy('tasks', { id: t + 'nocase', locationId: t + 'loc', description: 'General ' + word + 'nocase' });
const lc = await lawyerCookie('Zed Tester', t + '@example.test');
ok(lc.includes('hlsession'), 'lawyer test login works');
const ac = await adminCookie();
const search = async (cookie) => (await (await api('/api/search?q=' + encodeURIComponent(word), cookie)).json()).sessions?.map(s => s.description) || [];
const asLawyer = await search(lc), asAdmin = await search(ac);
ok(!asLawyer.some(d => d.endsWith('wall')), 'lawyer does NOT see session of ethical-wall case');
ok(!asLawyer.some(d => d.endsWith('hc')), 'lawyer does NOT see session of HIGHLY_CONFIDENTIAL case');
ok(asLawyer.some(d => d.endsWith('nocase')), 'lawyer still sees a session with no case');
ok(asAdmin.some(d => d.endsWith('wall')) && asAdmin.some(d => d.endsWith('hc')), 'senior admin sees walled and confidential sessions');
await insertDummy('clients', { id: t + 'cl', name: 'Client ' + word, phone: '0100000000', email: 'c@example.test' });
const cl = async (cookie) => (await (await api('/api/search?q=' + encodeURIComponent(word), cookie)).json()).clients || [];
ok((await cl(lc)).length === 0, 'lawyer without viewAdmin gets NO client names, phones or emails');
ok((await cl(ac)).some(c => c.name.includes(word)), 'senior admin still finds the client');
const anon = await api('/api/search?q=' + word);
ok(anon.status === 401, 'anonymous search refused (' + anon.status + ')');
await done('search-walls');
