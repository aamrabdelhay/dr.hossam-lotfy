import { hiddenCaseIdsForCurrentUser } from '@/lib/case-file-access';
import 'server-only';
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import type { SessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { OUTCOMES } from '@/lib/session-outcomes';

export { OUTCOMES } from '@/lib/session-outcomes';
export const todayCairo = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const mins = (t?: string | null) => { const m = /^(\d{2}):(\d{2})$/.exec(t ?? ''); return m ? +m[1] * 60 + +m[2] : null; };
export const SESSION_WINDOW_MIN = 90; // manual planning window, not a legal rule

export type SessionRow = { id: string; description: string; scheduledDate: Date | null; scheduledTime: string | null; caseId: string | null; locationName: string | null; caseLabel?: string | null };
const courtWhere = { status: { not: 'CANCELLED' as const }, scheduledDate: { not: null }, location: { type: 'COURT' as const } };

export async function sessionsOfLawyer(lawyerId: string, from?: Date, to?: Date): Promise<SessionRow[]> {
  const hidden = await hiddenCaseIdsForCurrentUser(); // ethical walls and confidential cases: same rule as feeds and search
  const rows = await prisma.task.findMany({ where: { ...courtWhere, ...(hidden.length ? { OR: [{ caseId: null }, { caseId: { notIn: hidden } }] } : {}), assignees: { some: { lawyerId } }, ...(from || to ? { scheduledDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}) },
    select: { id: true, description: true, scheduledDate: true, scheduledTime: true, caseId: true, location: { select: { name: true } }, caseRecord: { select: { name: true, number: true } } }, orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }], take: 500 });
  return rows.map((r) => ({ id: r.id, description: r.description, scheduledDate: r.scheduledDate, scheduledTime: r.scheduledTime, caseId: r.caseId, locationName: r.location?.name ?? null, caseLabel: r.caseRecord ? `${r.caseRecord.name} - ${r.caseRecord.number}` : null }));
}

/** Item 108: sessions of one lawyer that start within the window of each other on the same date. */
export async function findConflicts(lawyerId: string, date: string) {
  const day = new Date(date + 'T00:00:00.000Z');
  const s = await sessionsOfLawyer(lawyerId, day, day);
  const out: Array<{ a: string; b: string; gapMinutes: number | null }> = [];
  for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) {
    const x = mins(s[i].scheduledTime), y = mins(s[j].scheduledTime);
    if (x === null || y === null) { out.push({ a: s[i].id, b: s[j].id, gapMinutes: null }); continue; } // no time set: cannot rule out an overlap
    if (Math.abs(x - y) < SESSION_WINDOW_MIN) out.push({ a: s[i].id, b: s[j].id, gapMinutes: Math.abs(x - y) });
  }
  return { date, windowMinutes: SESSION_WINDOW_MIN, sessions: s.map((r) => r.id), conflicts: out };
}

/** Item 107: past court sessions with no recorded outcome. */
export async function unrecorded(session: SessionUser) {
  const day = new Date(todayCairo() + 'T00:00:00.000Z');
  const hiddenU = await hiddenCaseIdsForCurrentUser();
  const rows = await prisma.task.findMany({ where: { ...courtWhere, ...(hiddenU.length ? { OR: [{ caseId: null }, { caseId: { notIn: hiddenU } }] } : {}), scheduledDate: { lt: day }, ...(session.role === 'lawyer' ? { assignees: { some: { lawyerId: session.lawyerId } } } : {}) },
    select: { id: true, description: true, scheduledDate: true, scheduledTime: true, caseId: true }, orderBy: { scheduledDate: 'desc' }, take: 300 });
  if (!rows.length) return [];
  const rec = await prisma.$queryRawUnsafe<Array<{ task_id: string }>>(`SELECT "task_id" FROM "task_feedback" WHERE "task_id"=ANY($1::text[]) AND (COALESCE("outcome_code",'')<>'' OR COALESCE("result",'')<>'' OR COALESCE("feedback",'')<>'')`, rows.map((r) => r.id));
  const has = new Set(rec.map((r) => r.task_id));
  return rows.filter((r) => !has.has(r.id));
}

export async function canActOnTask(session: SessionUser, taskId: string) {
  const t = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true, caseId: true, assignees: { select: { lawyerId: true } } } });
  if (!t) return null;
  const mine = session.role === 'lawyer' && t.assignees.some((a) => a.lawyerId === session.lawyerId);
  return { task: t, allowed: session.role === 'admin' || mine, mine };
}

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (c) => '\\' + c);
/** Item 109: iCalendar export. Floating local time (no timezone claim), one hour default length. */
export function toIcs(rows: SessionRow[]) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Loutfi Law firm//Sessions//AR', 'CALSCALE:GREGORIAN'];
  for (const r of rows) {
    if (!r.scheduledDate) continue;
    const d = r.scheduledDate.toISOString().slice(0, 10).replaceAll('-', '');
    const m = mins(r.scheduledTime);
    lines.push('BEGIN:VEVENT', `UID:${r.id}@loutfi-sessions`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`);
    if (m === null) lines.push(`DTSTART;VALUE=DATE:${d}`);
    else { const hh = String(Math.floor(m / 60)).padStart(2, '0'), mm = String(m % 60).padStart(2, '0'), e = Math.min(m + 60, 23 * 60 + 59); lines.push(`DTSTART:${d}T${hh}${mm}00`, `DTEND:${d}T${String(Math.floor(e / 60)).padStart(2, '0')}${String(e % 60).padStart(2, '0')}00`); }
    lines.push(`SUMMARY:${esc(r.description.slice(0, 120))}`); if (r.locationName) lines.push(`LOCATION:${esc(r.locationName)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

/** Item 105: substitute request. Accepting adds the substitute as an assignee; the original assignee is kept until management removes them. */
export async function requestSubstitute(session: SessionUser, taskId: string, toLawyerId: string, reason: string) {
  const cur = await canActOnTask(session, taskId); if (!cur) return { error: 'not-found' as const }; if (!cur.allowed) return { error: 'forbidden' as const };
  const to = await prisma.lawyer.findFirst({ where: { id: toLawyerId, active: true }, select: { id: true } }); if (!to) return { error: 'bad-lawyer' as const };
  if (cur.task.assignees.some((a) => a.lawyerId === toLawyerId)) return { error: 'already-assigned' as const };
  const from = session.role === 'lawyer' ? session.lawyerId : (cur.task.assignees[0]?.lawyerId ?? '');
  const id = 'sub_' + crypto.randomUUID().replaceAll('-', '');
  await prisma.$executeRawUnsafe(`INSERT INTO "office_session_substitutes" ("id","task_id","from_lawyer_id","to_lawyer_id","reason","requested_by") VALUES ($1,$2,$3,$4,$5,$6)`, id, taskId, from, toLawyerId, reason, session.role === 'admin' ? 'admin:' + session.userId : 'lawyer:' + session.lawyerId);
  await prisma.notification.create({ data: { lawyerId: toLawyerId, type: 'SESSION_SUBSTITUTE', title: 'طلب نيابة عن جلسة', body: reason.slice(0, 120), link: '/sessions/' + taskId } as never }).catch(() => undefined);
  return { ok: true as const, id };
}
export async function decideSubstitute(session: SessionUser, subId: string, accept: boolean) {
  if (session.role !== 'lawyer') return { error: 'forbidden' as const };
  const r = (await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "office_session_substitutes" WHERE "id"=$1`, subId))[0];
  if (!r) return { error: 'not-found' as const }; if (r.to_lawyer_id !== session.lawyerId) return { error: 'forbidden' as const }; if (r.status !== 'PENDING') return { error: 'decided' as const };
  await prisma.$executeRawUnsafe(`UPDATE "office_session_substitutes" SET "status"=$2,"decided_at"=NOW() WHERE "id"=$1`, subId, accept ? 'ACCEPTED' : 'DECLINED');
  if (accept) await prisma.taskAssignment.upsert({ where: { taskId_lawyerId: { taskId: r.task_id, lawyerId: r.to_lawyer_id } }, create: { taskId: r.task_id, lawyerId: r.to_lawyer_id }, update: {} });
  await logAuditEvent({ actorLawyerId: session.lawyerId, action: accept ? 'SESSION_SUBSTITUTE_ACCEPTED' : 'SESSION_SUBSTITUTE_DECLINED', resourceType: 'task', resourceId: r.task_id, summary: 'Substitute decision', metadata: { substituteId: subId } });
  return { ok: true as const };
}

const csvCell = (v: unknown) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
/** Item 109: CSV (opens in Excel). Cells that start with a formula character are prefixed so they stay text. */
export function toCsv(rows: SessionRow[]) {
  const head = ['التاريخ', 'الساعة', 'الجلسة', 'المكان', 'القضية'];
  const lines = [head.map(csvCell).join(',')];
  for (const r of rows) lines.push([r.scheduledDate?.toISOString().slice(0, 10), r.scheduledTime, r.description, r.locationName, r.caseLabel].map(csvCell).join(','));
  return '\ufeff' + lines.join('\r\n') + '\r\n';
}

/** Item 102: arrival and departure taps for an assigned lawyer. Append-only, server time, no location data. */
export async function recordAttendance(session: SessionUser, taskId: string, kind: 'ARRIVE' | 'DEPART', note?: string) {
  if (session.role !== 'lawyer') return { error: 'lawyers-only' as const };
  const cur = await canActOnTask(session, taskId); if (!cur) return { error: 'not-found' as const }; if (!cur.mine) return { error: 'forbidden' as const };
  const last = (await prisma.$queryRawUnsafe<any[]>(`SELECT "kind" FROM "office_session_attendance" WHERE "task_id"=$1 AND "lawyer_id"=$2 ORDER BY "at" DESC LIMIT 1`, taskId, session.lawyerId))[0];
  if ((last?.kind ?? 'DEPART') === kind) return { error: 'out-of-order' as const };
  const id = 'att_' + crypto.randomUUID().replaceAll('-', '');
  await prisma.$executeRawUnsafe(`INSERT INTO "office_session_attendance" ("id","task_id","lawyer_id","kind","note") VALUES ($1,$2,$3,$4,$5)`, id, taskId, session.lawyerId, kind, note ?? null);
  await logAuditEvent({ actorLawyerId: session.lawyerId, action: 'SESSION_ATTENDANCE_' + kind, resourceType: 'task', resourceId: taskId, summary: kind, metadata: { attendanceId: id } });
  return { ok: true as const, id };
}
export const listAttendance = (taskId: string) => prisma.$queryRawUnsafe<any[]>(`SELECT "lawyer_id","kind","note","at" FROM "office_session_attendance" WHERE "task_id"=$1 ORDER BY "at" ASC LIMIT 100`, taskId);

/** Item 104: a day's court sessions in time order with MANUAL transit minutes (entered by management). Nothing is estimated from a map. */
export async function routePlan(lawyerId: string, date: string) {
  const day = new Date(date + 'T00:00:00.000Z');
  const rows = await prisma.task.findMany({ where: { ...courtWhere, scheduledDate: day, assignees: { some: { lawyerId } } }, select: { id: true, description: true, scheduledTime: true, locationId: true, location: { select: { name: true } } }, orderBy: [{ scheduledTime: 'asc' }], take: 50 });
  const t = await prisma.$queryRawUnsafe<any[]>(`SELECT "from_location_id","to_location_id","minutes" FROM "office_transit_minutes"`);
  const m = new Map(t.map((x) => [x.from_location_id + '>' + x.to_location_id, x.minutes as number]));
  const legs = [];
  for (let i = 0; i + 1 < rows.length; i++) {
    const a = rows[i], b = rows[i + 1];
    const gap = mins(b.scheduledTime) !== null && mins(a.scheduledTime) !== null ? mins(b.scheduledTime)! - mins(a.scheduledTime)! : null;
    const transit = a.locationId === b.locationId ? 0 : m.get(a.locationId + '>' + b.locationId) ?? m.get(b.locationId + '>' + a.locationId) ?? null;
    legs.push({ from: a.id, to: b.id, fromPlace: a.location?.name, toPlace: b.location?.name, startGapMinutes: gap, manualTransitMinutes: transit, status: transit === null ? 'transit-not-entered' : gap === null ? 'time-missing' : gap < transit ? 'too-tight' : 'ok' });
  }
  return { date, sessions: rows.map((r) => ({ id: r.id, time: r.scheduledTime, place: r.location?.name })), legs, note: 'الدقائق تُدخل يدويًا من الإدارة وليست تقدير خريطة.' };
}

/** Item 109: PDF table of sessions (Arabic RTL, A4). Cells wrap and rows grow, pages break; no text is cut. */
export async function toPdf(rows: SessionRow[], title: string) {
  const { newArabicPdf, rtlLine, rtlCell, wrapLines, pdfToBuffer } = await import('@/lib/pdf-rtl');
  const doc = newArabicPdf();
  const right = 555, cols = [{ w: 62, h: 'التاريخ' }, { w: 40, h: 'الساعة' }, { w: 150, h: 'الجلسة' }, { w: 120, h: 'المكان' }, { w: 143, h: 'القضية' }];
  const header = (n: number) => { rtlLine(doc, 'Loutfi Law firm', right, 36, { font: 'bold', size: 12 }); rtlLine(doc, title, right, 56, { font: 'bold', size: 16 }); rtlLine(doc, 'صفحة ' + n, 80, 40, { size: 9 }); };
  const rowHead = (y: number) => { let x = right; for (const c of cols) { rtlLine(doc, c.h, x, y, { font: 'bold', size: 11 }); x -= c.w; } doc.moveTo(40, y + 20).lineTo(555, y + 20).stroke(); };
  let page = 1; header(page); let y = 96; rowHead(y); y += 28;
  for (const r of rows) {
    const vals = [r.scheduledDate?.toISOString().slice(0, 10) ?? '', r.scheduledTime ?? '', r.description, r.locationName ?? '', r.caseLabel ?? ''];
    const heights = vals.map((v, i) => wrapLines(doc, v, cols[i].w - 8, 'reg', 10).length * 15);
    const h = Math.max(...heights) + 8;
    if (y + h > 800) { doc.addPage(); page++; header(page); y = 96; rowHead(y); y += 28; }
    let x = right; vals.forEach((v, i) => { rtlCell(doc, v, x, y, cols[i].w - 8, { size: 10 }); x -= cols[i].w; });
    y += h; doc.moveTo(40, y - 4).lineTo(555, y - 4).strokeColor('#cccccc').stroke().strokeColor('#000000');
  }
  if (!rows.length) rtlLine(doc, 'لا توجد جلسات', right, y, { size: 11 });
  return pdfToBuffer(doc);
}

/** Item 109: real .xlsx (exceljs), RTL sheet. Text cells starting with a formula character are stored as text. */
export async function toXlsx(rows: SessionRow[]) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('الجلسات', { views: [{ rightToLeft: true }] });
  ws.columns = [{ header: 'التاريخ', key: 'd', width: 14 }, { header: 'الساعة', key: 't', width: 10 }, { header: 'الجلسة', key: 's', width: 50 }, { header: 'المكان', key: 'p', width: 30 }, { header: 'القضية', key: 'c', width: 40 }];
  ws.getRow(1).font = { bold: true }; ws.columns.forEach((c) => { c.alignment = { wrapText: true, vertical: 'top' }; });
  const safe = (v: unknown) => { const s = String(v ?? ''); return /^[=+\-@\t\r]/.test(s) ? "'" + s : s; };
  for (const r of rows) ws.addRow({ d: r.scheduledDate?.toISOString().slice(0, 10) ?? '', t: r.scheduledTime ?? '', s: safe(r.description), p: safe(r.locationName), c: safe(r.caseLabel) });
  return Buffer.from(await wb.xlsx.writeBuffer());
}
