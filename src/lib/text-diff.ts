/** Item 149: word-level text comparison (LCS). Pure, runs in the browser. Mixed Arabic/Latin tokens stay in original order. */
export type DiffPart = { op: 'same' | 'add' | 'del'; text: string };
export function tokenize(s: string): string[] { return s.split(/(\s+)/).filter((x) => x.length > 0); }
export function diffText(a: string, b: string): DiffPart[] {
  const x = tokenize(a), y = tokenize(b);
  if (x.length * y.length > 4_000_000) throw new Error('النصان كبيران جدًا للمقارنة هنا');
  const n = x.length, m = y.length;
  const t: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) t[i][j] = x[i] === y[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
  const out: DiffPart[] = [];
  const push = (op: DiffPart['op'], text: string) => { const l = out[out.length - 1]; if (l && l.op === op) l.text += text; else out.push({ op, text }); };
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (x[i] === y[j]) { push('same', x[i]); i++; j++; }
    else if (t[i + 1][j] >= t[i][j + 1]) { push('del', x[i]); i++; }
    else { push('add', y[j]); j++; }
  }
  while (i < n) push('del', x[i++]);
  while (j < m) push('add', y[j++]);
  return out;
}
export function diffStats(p: DiffPart[]) {
  const w = (s: string) => s.split(/\s+/).filter(Boolean).length;
  return { added: p.filter((d) => d.op === 'add').reduce((k, d) => k + w(d.text), 0), removed: p.filter((d) => d.op === 'del').reduce((k, d) => k + w(d.text), 0), unchanged: p.filter((d) => d.op === 'same').reduce((k, d) => k + w(d.text), 0) };
}
