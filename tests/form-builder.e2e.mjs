// Items 85/86: form builder and conditional fields, enforced on the server. Synthetic data only.
import { db, ok, q, insertDummy, adminCookie, lawyerCookie, api, done } from './helpers.mjs';
await db.connect();
const t = 'fb' + Date.now();
const post = (p, c, b) => api(p, c, { method: 'POST', body: JSON.stringify(b) });
const ac = await adminCookie();
await insertDummy('lawyers', { id: t + 'l', fullName: 'Form L', email: t + 'l@example.test', slug: t + 'ls', approvedAt: new Date(), active: true });
const lc = await lawyerCookie('Form L', t + 'l@example.test');
const def = { fields: [
  { key: 'kind', label: 'Kind', type: 'select', required: true, options: ['company', 'person'] },
  { key: 'companyName', label: 'Company', type: 'text', required: true, showIf: { field: 'kind', equals: 'company' } },
  { key: 'age', label: 'Age', type: 'number', showIf: { field: 'kind', equals: 'person' } },
  { key: 'when', label: 'Date', type: 'date' }, { key: 'ok', label: 'Agree', type: 'checkbox' },
] };
ok((await post('/api/admin/forms', lc, { title: 'x', definition: def })).status === 403, 'plain lawyer cannot build forms');
ok((await post('/api/admin/forms', ac, { title: 'bad', definition: { fields: [{ key: 'a', label: 'A', type: 'text', showIf: { field: 'zzz', equals: 'x' } }] } })).status === 400, 'showIf to unknown field rejected');
ok((await post('/api/admin/forms', ac, { title: 'bad2', definition: { fields: [{ key: 'a', label: 'A', type: 'text', showIf: { field: 'a', equals: 'x' } }] } })).status === 400, 'showIf to itself or a later field rejected');
ok((await post('/api/admin/forms', ac, { title: 'bad3', definition: { fields: [{ key: 's', label: 'S', type: 'select' }] } })).status === 400, 'select without options rejected');
const created = await (await post('/api/admin/forms', ac, { title: 'T ' + t, definition: def })).json();
ok(!!created.id, 'form created');
const sub = (c, answers) => post(`/api/forms/${created.id}/submit`, c, { answers });
let r = await sub(lc, { kind: 'company' }); ok(r.status === 400 && (await r.json()).fields.companyName === 'required', 'visible required field is enforced');
r = await sub(lc, { kind: 'person', age: '31' }); ok(r.status === 201, 'hidden required field is not required');
r = await sub(lc, { kind: 'person', companyName: 'Leak Inc', age: 5 });
const stored = await q(`SELECT answers FROM office_form_responses WHERE form_id=$1 ORDER BY submitted_at DESC`, [created.id]);
ok(r.status === 201 && !('companyName' in stored[0].answers), 'answer for a hidden field is dropped');
ok((await sub(lc, { kind: 'alien' })).status === 400, 'select value outside options rejected');
ok((await sub(lc, { kind: 'person', age: 'abc' })).status === 400, 'non-number rejected');
ok((await sub(lc, { kind: 'person', when: '31/12/2026' })).status === 400, 'bad date rejected');
ok((await post(`/api/forms/${created.id}x/submit`, lc, { answers: {} })).status === 404, 'unknown form 404');
ok((await post(`/api/forms/${created.id}/submit`, undefined, { answers: {} })).status === 401, 'anonymous cannot submit');
ok((await api(`/api/admin/forms/${created.id}/responses`, lc)).status === 403, 'plain lawyer cannot read responses');
const rs = await api(`/api/admin/forms/${created.id}/responses`, ac); const body = await rs.json();
ok(rs.status === 200 && body.responses.length === 2, 'senior reads responses (' + body.responses?.length + ')');
ok((await q(`SELECT count(*)::int n FROM office_audit_events WHERE action='FORM_RESPONSES_READ' AND resource_id=$1`, [created.id]))[0].n === 1, 'response read is audit logged');
await done('form-builder');
