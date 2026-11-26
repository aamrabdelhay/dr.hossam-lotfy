// Mirror of completeness() in src/lib/data-tools.ts, for a pure check without a server import.
const FIELDS = ['name', 'phone', 'email', 'nationalId', 'address'];
export function completeness(c) { const missing = FIELDS.filter((f) => !String(c[f] ?? '').trim()); return { score: Math.round(((FIELDS.length - missing.length) / FIELDS.length) * 100), missing }; }
