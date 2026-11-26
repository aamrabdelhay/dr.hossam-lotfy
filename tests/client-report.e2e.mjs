// Part 4 item 214: client PDF is client-safe. Synthetic data only.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { db, ok, q, insertDummy, adminCookie, api, done } from './helpers.mjs';
await db.connect();
const t = 'cr' + Date.now(); const ac = await adminCookie();
await insertDummy('case_records', { id: t + 'c', name: 'CR ' + t, number: 'CR' + t });
await insertDummy('case_events', { id: t + 'e', caseId: t + 'c', description: 'INTERNALSECRETNOTE', type: 'note' });
const r = await api(`/api/cases/${t}c/client-report?summary=${encodeURIComponent('تم تحديد جلسة')}`, ac);
const b = Buffer.from(await r.arrayBuffer());
ok(r.status === 200 && r.headers.get('content-type') === 'application/pdf' && b.subarray(0, 4).toString() === '%PDF', 'real PDF returned');
writeFileSync('/tmp/cr.pdf', b); const txt = execFileSync('pdftotext', ['/tmp/cr.pdf', '-']).toString();
ok(!txt.includes('INTERNALSECRETNOTE') && txt.includes('CR' + t), 'extracted text has the case number and never the internal event');
ok((await api('/api/cases/nope/client-report', ac)).status === 404, 'unknown case 404');
await done('client-report');
