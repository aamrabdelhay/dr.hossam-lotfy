export type Unit = 'DAYS' | 'MONTHS' | 'YEARS';
/** Calendar arithmetic on a plain date (YYYY-MM-DD). Months and years clamp to the last day of a shorter month. Weekends, public holidays and court recess are NOT adjusted: the responsible lawyer must check them. */
export function addPeriod(start: string, unit: Unit, amount: number): string {
  const [y, m, d] = start.split('-').map(Number);
  if (!y || !m || !d) throw new Error('bad date');
  if (unit === 'DAYS') { const t = new Date(Date.UTC(y, m - 1, d + amount)); return t.toISOString().slice(0, 10); }
  const months = unit === 'YEARS' ? amount * 12 : amount; const idx = (m - 1) + months; const ty = y + Math.floor(idx / 12), tm = ((idx % 12) + 12) % 12;
  const last = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  return new Date(Date.UTC(ty, tm, Math.min(d, last))).toISOString().slice(0, 10);
}
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000);
