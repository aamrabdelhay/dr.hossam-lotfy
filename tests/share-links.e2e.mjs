// Item 10 verification: expired, revoked, exhausted and unknown share tokens are refused before any file is read. Synthetic rows only.
import crypto from 'node:crypto';
import { db, ok, q, insertDummy, api, done } from './helpers.mjs';
await db.connect();
const t = 'sl' + Date.now();
const mk = async (k, o) => { const token = crypto.randomBytes(32).toString('base64url'); const h = crypto.createHash('sha256').update(token).digest('hex');
  await insertDummy('office_secure_file_links', { id: t + k, token_hash: h, file_type: 'case', file_id: 'nofile', resource_id: 'nores', file_name: 'x.pdf', storage_url: 'https://example.test/none', max_downloads: 1, download_count: 0, expires_at: new Date(Date.now() + 3600e3), ...o }); return token; };
const get = async (tok) => (await api('/api/public/file-share/' + tok)).status;
ok(await get(await mk('exp', { expires_at: new Date(Date.now() - 1000) })) === 404, 'expired token refused');
ok(await get(await mk('rev', { revoked_at: new Date() })) === 404, 'revoked token refused');
ok(await get(await mk('exh', { download_count: 1 })) === 404, 'exhausted token refused');
ok(await get(crypto.randomBytes(32).toString('base64url')) === 404, 'unknown token refused');
ok(await get('short') === 404, 'malformed token refused');
const tok = await mk('live', {});
const s = await get(tok);
const row = (await q(`SELECT download_count FROM office_secure_file_links WHERE id=$1`, [t + 'live']))[0];
ok(s === 404 && row.download_count === 1, 'live token whose file is missing is refused (status ' + s + ') and the use is counted');
ok(await get(tok) === 404, 'a second use is refused (single download)');
await done('share-links');
