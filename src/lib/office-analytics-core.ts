/** Pure: projected load after adding `extra` hypothetical tasks one at a time to whoever has the lowest load (item 189). Arithmetic only; it knows nothing about skills or availability. */
export function simulate(loads: { id: string; open: number }[], extra: number, capacity: number) {
  const cur = loads.map((l) => ({ id: l.id, open: l.open, added: 0 }));
  for (let i = 0; i < extra && cur.length; i++) { cur.sort((a, b) => a.open + a.added - (b.open + b.added) || a.id.localeCompare(b.id)); cur[0].added++; }
  return cur.map((c) => ({ id: c.id, before: c.open, added: c.added, after: c.open + c.added, loadPercent: Math.round(((c.open + c.added) / capacity) * 100), overCapacity: c.open + c.added > capacity }));
}

