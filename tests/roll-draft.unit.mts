import { parseRoll } from '../src/lib/roll-draft-core.ts';
let fail = 0; const eq = (a: unknown, b: unknown, m: string) => { const c = JSON.stringify(a) === JSON.stringify(b); console.log((c ? 'PASS ' : 'FAIL ') + m + (c ? '' : ` got ${JSON.stringify(a)}`)); if (!c) fail++; };
const r = parseRoll('2031-05-01 09:30 4455/2026 محكمة القاهرة\n٠٢/٠٦/٢٠٣١ | ١٠:٠٠ | ١٢٣/٢٠٢٥ | الدائرة ٥\nسطر بلا بيانات\n31/02/2031 11:00 9/2026');
eq([r[0].date, r[0].time, r[0].caseNumber], ['2031-05-01', '09:30', '4455/2026'], 'ISO line');
eq([r[1].date, r[1].time, r[1].caseNumber, r[1].rest], ['2031-06-02', '10:00', '123/2025', 'الدائرة 5'], 'Arabic-Indic digits and separators');
eq(r[2].problems.length, 2, 'unreadable line is kept with two problems');
eq([r[3].date, r[3].problems.includes('التاريخ غير مقروء')], [null, true], 'impossible date 31/02 is rejected, not rolled over');
eq(r.length, 4, 'no line dropped');
process.exit(fail ? 1 : 0);
