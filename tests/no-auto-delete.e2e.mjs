// Stage 1 / Phase 0 test: files are never deleted automatically.
// Needs a DISPOSABLE database and a running app (see tests/README-stage1.md). Synthetic data only.
import pg from 'pg';
const BASE = process.env.APP_BASE || 'http://127.0.0.1:3300';
const CRON = process.env.CRON_SECRET, CODE = process.env.ADMIN_ACCESS_CODE;
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const q = async (s, a = []) => (await db.query(s, a)).rows;
async function insertDummy(table, extra) {
  const cols = await q(`SELECT column_name,data_type,column_default,is_nullable FROM information_schema.columns WHERE table_name=$1`, [table]);
  const vals = { ...extra };
  for (const c of cols) {
    if (c.column_name in vals || c.is_nullable === 'YES' || c.column_default) continue;
    vals[c.column_name] = /int|numeric/.test(c.data_type) ? 0 : /bool/.test(c.data_type) ? false : /timestamp|date/.test(c.data_type) ? new Date() : 'x';
  }
  const names = Object.keys(vals);
  await q(`INSERT INTO "${table}" (${names.map(n => `"${n}"`).join(',')}) VALUES (${names.map((_, i) => '$' + (i + 1)).join(',')})`, names.map(n => vals[n]));
}
await db.connect();
const tag = 'ztest' + Date.now();
// seed: a case, a soft-deleted file, an APPROVED request whose 31 days ended yesterday, and its archive row
await insertDummy('case_records', { id: tag + 'case' });
await q(`INSERT INTO case_files (id,case_id,name,kind,url,deleted_at) VALUES ($1,$2,'synthetic.pdf','pdf','private://nonexistent/' || $1, NOW() - INTERVAL '32 days')`, [tag + 'f', tag + 'case']);
await q(`INSERT INTO office_archive (id,entity_type,entity_id,label,snapshot_json,expires_at) VALUES ($1,'case_file',$2,'synthetic.pdf','{}'::jsonb,NOW() - INTERVAL '1 day')`, [tag + 'arc', tag + 'f']).catch(async () => {
  await q(`INSERT INTO office_archive (id,entity_type,entity_id,label,snapshot_json) VALUES ($1,'case_file',$2,'synthetic.pdf','{}'::jsonb)`, [tag + 'arc', tag + 'f']);
});
await q(`INSERT INTO office_file_deletion_requests (id,file_type,file_id,resource_id,file_name,file_kind,storage_url,reason,status,archive_id,archive_expires_at,decided_at)
         VALUES ($1,'case',$2,$3,'synthetic.pdf','pdf','private://nonexistent/'||$2,'test','APPROVED',$4,NOW() - INTERVAL '1 day',NOW() - INTERVAL '32 days')`,
  [tag + 'req', tag + 'f', tag + 'case', tag + 'arc']);
const cron = () => fetch(BASE + '/api/cron/email-reminders', { headers: { authorization: 'Bearer ' + CRON } }).then(r => r.json().then(j => [r.status, j]));
const [st1, j1] = await cron();
ok(st1 === 200, 'cron returns 200 (got ' + st1 + ')');
ok(j1.fileDeletionCleanup?.expired >= 1 && j1.fileDeletionCleanup?.autoDeleted === 0, 'cron marks expiry and reports autoDeleted=0: ' + JSON.stringify(j1.fileDeletionCleanup));
let r = (await q(`SELECT status,archive_expired_at,purged_at FROM office_file_deletion_requests WHERE id=$1`, [tag + 'req']))[0];
ok(r.status === 'ARCHIVE_EXPIRED' && r.archive_expired_at && !r.purged_at, 'request status is ARCHIVE_EXPIRED, not PURGED');
ok((await q(`SELECT 1 FROM case_files WHERE id=$1`, [tag + 'f'])).length === 1, 'case_files row still exists after expiry');
ok((await q(`SELECT 1 FROM office_archive WHERE id=$1`, [tag + 'arc'])).length === 1, 'office_archive row still exists after expiry');
ok((await q(`SELECT 1 FROM office_audit_events WHERE action='ARCHIVE_PERIOD_ENDED' AND resource_id=$1`, [tag + 'req'])).length === 1, 'audit event ARCHIVE_PERIOD_ENDED recorded');
const [, j2] = await cron();
ok(j2.fileDeletionCleanup?.expired === 0, 'second cron run is idempotent (no repeat notice)');
// senior restore AFTER expiry must work (new explicit action), anonymous must not
const anon = await fetch(BASE + '/api/admin/file-deletion-requests', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: tag + 'req', action: 'restore' }) });
ok(anon.status === 401 || anon.status === 403, 'anonymous restore refused (' + anon.status + ')');
const login = await fetch(BASE + '/api/auth/admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: CODE }) });
const cookie = (login.headers.getSetCookie?.() || []).map(c => c.split(';')[0]).join('; ');
ok(login.status === 200 && cookie.includes('hlsession'), 'admin login for test');
const list = await fetch(BASE + '/api/admin/file-deletion-requests', { headers: { cookie } }).then(x => x.json());
ok((list.archives || []).some(a => a.id === tag + 'req' && a.status === 'ARCHIVE_EXPIRED'), 'expired item still listed to senior management');
const rs = await fetch(BASE + '/api/admin/file-deletion-requests', { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ id: tag + 'req', action: 'restore' }) });
ok(rs.status === 200, 'senior restore after expiry works (got ' + rs.status + ')');
ok((await q(`SELECT deleted_at FROM case_files WHERE id=$1`, [tag + 'f']))[0].deleted_at === null, 'restored file is active again');
ok((await q(`SELECT status FROM office_file_deletion_requests WHERE id=$1`, [tag + 'req']))[0].status === 'RESTORED', 'request status RESTORED');
await db.end();
console.log(fails ? 'FAILED ' + fails : 'ALL PASSED');
process.exit(fails ? 1 : 0);
