// Item 67/68: every quick-action link in the My Day panel must open a real page (no 404). Synthetic data only.
import fs from 'node:fs';
import { ok, adminCookie, api, done, db } from './helpers.mjs';
await db.connect();
const src = fs.readFileSync('src/components/my-day-personal-panel.tsx', 'utf8');
const hrefs = [...src.matchAll(/href: '([^']+)'/g)].map((m) => m[1]);
ok(hrefs.length >= 6, 'found the quick-action links (' + hrefs.length + ')');
const ac = await adminCookie();
for (const h of hrefs) { const r = await api(h.split('#')[0], ac); ok(r.status < 400, `quick link ${h} opens (status ${r.status})`); }
await done('quick-links');
