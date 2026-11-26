export type RollLine = { line: number; raw: string; date: string | null; time: string | null; caseNumber: string | null; rest: string; problems: string[] };
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const norm = (s: string) => s.replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d))).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
const iso = (y: number, m: number, d: number) => { const t = new Date(Date.UTC(y, m - 1, d)); return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d ? t.toISOString().slice(0, 10) : null; };
/** Turn pasted or typed court-roll text into DRAFT rows for a person to review. Nothing is saved. Dates: YYYY-MM-DD or DD/MM/YYYY. Time: HH:MM. Case number: N/YYYY. Lines that cannot be read are kept with a problem note, never dropped. */
export function parseRoll(text: string): RollLine[] {
  return norm(text).split(/\r?\n/).map((raw, i) => ({ raw: raw.trim(), line: i + 1 })).filter((x) => x.raw).slice(0, 200).map(({ raw, line }) => {
    let rest = raw; const problems: string[] = []; let date: string | null = null, time: string | null = null, caseNumber: string | null = null;
    const a = rest.match(/\b(\d{4})-(\d{2})-(\d{2})\b/), b = rest.match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})\b/);
    if (a) { date = iso(+a[1], +a[2], +a[3]); rest = rest.replace(a[0], ' '); } else if (b) { date = iso(+b[3], +b[2], +b[1]); rest = rest.replace(b[0], ' '); }
    if (!date) problems.push('التاريخ غير مقروء');
    const t = rest.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/); if (t) { time = t[1].padStart(2, '0') + ':' + t[2]; rest = rest.replace(t[0], ' '); }
    const c = rest.match(/\b(\d{1,6})\s*\/\s*(\d{4})\b/); if (c) { caseNumber = c[1] + '/' + c[2]; rest = rest.replace(c[0], ' '); } else problems.push('رقم القضية غير موجود');
    return { line, raw, date, time, caseNumber, rest: rest.replace(/[|،,;]+/g, ' ').replace(/\s+/g, ' ').trim(), problems };
  });
}
