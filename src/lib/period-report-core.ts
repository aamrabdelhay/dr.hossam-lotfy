/** Items 212/213 (pure part): months between two YYYY-MM values and month-over-month change per branch. */
export type Cell = { month: string; branch: string; tasksCreated: number; tasksCompleted: number; filesUploaded: number; invoiced: number | null; received: number | null };
export function monthsBetween(from: string, to: string): string[] {
  if (!/^\d{4}-\d{2}$/.test(from) || !/^\d{4}-\d{2}$/.test(to) || to < from) throw new Error('الفترة غير صحيحة');
  const out: string[] = []; let [y, m] = from.split('-').map(Number); const [ty, tm] = to.split('-').map(Number);
  while (y < ty || (y === ty && m <= tm)) { out.push(`${y}-${String(m).padStart(2, '0')}`); m++; if (m > 12) { m = 1; y++; } if (out.length > 36) throw new Error('الحد الأقصى 36 شهرًا'); }
  return out;
}
export function withDeltas(cells: Cell[]) {
  const key = (c: Cell) => c.branch; const byBranch = new Map<string, Cell[]>();
  for (const c of cells) (byBranch.get(key(c)) ?? byBranch.set(key(c), []).get(key(c))!).push(c);
  const out: (Cell & { tasksCompletedDelta: number | null; filesUploadedDelta: number | null })[] = [];
  for (const list of byBranch.values()) { list.sort((a, b) => (a.month < b.month ? -1 : 1)); list.forEach((c, i) => out.push({ ...c, tasksCompletedDelta: i ? c.tasksCompleted - list[i - 1].tasksCompleted : null, filesUploadedDelta: i ? c.filesUploaded - list[i - 1].filesUploaded : null })); }
  return out.sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : a.branch.localeCompare(b.branch)));
}
