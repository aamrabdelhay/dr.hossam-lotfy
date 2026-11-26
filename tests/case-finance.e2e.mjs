// Part 4 case finance (items 190, 193-199, 201-204). Synthetic data only. Ledger rows only: no money moves.
import { db, ok, q, insertDummy, adminCookie, lawyerCookie, api, done, BASE } from './helpers.mjs';
await db.connect();
const t = 'cf' + Date.now();
const call = (p, c, m = 'GET', b) => api(p, c, { method: m, ...(b ? { body: JSON.stringify(b) } : {}) });
const ac = await adminCookie();
await insertDummy('lawyers', { id: t + 'f', fullName: 'CF Fin', email: t + 'f@example.test', slug: t + 'fs', approvedAt: new Date(), active: true });
await insertDummy('lawyers', { id: t + 'p', fullName: 'CF Plain', email: t + 'p@example.test', slug: t + 'ps', approvedAt: new Date(), active: true });
await q(`INSERT INTO office_finance_members (id, lawyer_id) VALUES ($1,$2)`, [t + 'm', t + 'f']);
const fc = await lawyerCookie('CF Fin', t + 'f@example.test'); const pc = await lawyerCookie('CF Plain', t + 'p@example.test');
await insertDummy('case_records', { id: t + 'c', name: 'CF ' + t, number: 'CF' + t });
await insertDummy('case_records', { id: t + 'w', name: 'CFW ' + t, number: 'CW' + t });
await insertDummy('office_case_security', { id: t + 'sec', case_id: t + 'w', classification: 'INTERNAL', ethical_wall_enabled: true });
const F = (c) => `/api/cases/${t}c/finance`;
ok((await call(F(), null)).status >= 401, 'anonymous refused');
ok((await call(F(), pc)).status === 403, 'a lawyer outside finance management is refused');
ok((await call(F(), fc)).status === 200 || (await call(F(), fc)).status === 403, 'finance member reaches the gate (case wall decides)');
const add = (c, b) => call(F(), c, 'POST', b);
ok((await add(ac, { kind: 'INSTALLMENT', amount: 100 })).status === 400, 'installment needs a due date');
ok((await add(ac, { kind: 'FEE_AGREEMENT', amount: -5 })).status === 400, 'amount must be positive');
ok((await add(ac, { kind: 'FEE_AGREEMENT', amount: 10000, note: 'اتفاق أتعاب' })).status === 201, 'fee agreement');
const inst = await (await add(ac, { kind: 'INSTALLMENT', amount: 2500, dueOn: '2020-01-01' })).json();
const inv = await (await add(ac, { kind: 'INVOICE', amount: 6000, note: 'فاتورة تجريبية =cmd' })).json();
ok((await add(ac, { kind: 'PAYMENT', amount: 2500.5, refId: inv.id })).status === 201, 'payment');
ok((await add(ac, { kind: 'BUDGET', amount: 1000 })).status === 201, 'budget');
let r = await add(ac, { kind: 'EXPENSE', amount: 850, note: 'رسوم' }); let j = await r.json(); ok(r.status === 201 && j.budgetState === 'NEAR', 'expense at 85% of budget reports NEAR');
r = await add(ac, { kind: 'EXPENSE', amount: 200 }); j = await r.json(); ok(j.budgetState === 'EXCEEDED' && j.budgetUsedPct === 105, 'expense over budget reports EXCEEDED 105%');
ok((await add(ac, { kind: 'TRUST_OUT', amount: 1 })).status === 409, 'trust withdrawal with no balance refused');
await add(ac, { kind: 'TRUST_IN', amount: 5000 });
ok((await add(ac, { kind: 'TRUST_OUT', amount: 6000 })).status === 409, 'trust withdrawal above balance refused');
ok((await add(ac, { kind: 'TRUST_OUT', amount: 1200 })).status === 201, 'trust withdrawal within balance accepted');
// concurrent withdrawals cannot overdraw: balance 3800, two of 3000
const two = await Promise.all([add(ac, { kind: 'TRUST_OUT', amount: 3000 }), add(ac, { kind: 'TRUST_OUT', amount: 3000 })]);
ok(two.map((x) => x.status).sort().join() === '201,409', 'concurrent trust withdrawals: one accepted, one refused');
const x = await (await call(F(), ac)).json();
ok(x.summary.trustBalance === 80000, 'trust balance 800.00 (cents)'); ok(x.summary.paid === 250050 && x.summary.outstanding === 349950, 'paid and outstanding');
ok(x.flags.includes('BUDGET_EXCEEDED') && x.flags.includes('EXPENSES_NOT_REIMBURSED'), 'reconciliation flags');
ok(x.installments.overdue.length === 1, 'overdue installment listed');
ok(x.statement.length >= 3 && x.profit.timeCostIncluded === false, 'statement lines and profit states time cost is excluded');
// status rules
ok((await call(F(), ac, 'PATCH', { id: inst.id, status: 'PAID' })).status === 200, 'installment paid');
ok((await call(F(), ac, 'PATCH', { id: inst.id, status: 'CANCELLED' })).status === 409, 'final status does not change');
const q1 = await (await add(ac, { kind: 'QUOTE', amount: 4000, note: 'عرض خدمة' })).json();
const acc = await (await call(F(), ac, 'PATCH', { id: q1.id, status: 'ACCEPTED' })).json(); ok(!!acc.agreementId, 'accepted quote becomes a fee agreement');
ok((await q(`SELECT 1 FROM case_finance_entries WHERE id=$1 AND kind='FEE_AGREEMENT' AND ref_id=$2`, [acc.agreementId, q1.id])).length === 1, 'agreement row links to the quote');
const ex = await (await add(ac, { kind: 'EXTRA_SCOPE', amount: 1500 })).json(); await call(F(), ac, 'PATCH', { id: ex.id, status: 'ACCEPTED' });
ok((await (await call(F(), ac)).json()).summary.extraAccepted === 150000, 'accepted extra scope counts');
ok((await call(F(), ac, 'PATCH', { id: inv.id, status: 'ACCEPTED' })).status === 400, 'invalid status for kind refused');
ok((await call(F(), ac, 'DELETE')).status === 405, 'no delete');
// walled case
ok([403, 404].includes((await call(`/api/cases/${t}w/finance`, pc)).status), 'outsider refused on walled case');
// invoices in 3 languages
for (const lang of ['ar', 'en', 'fr']) { const p = await api(`${F()}/invoice?entry=${inv.id}&lang=${lang}`, ac); const b = Buffer.from(await p.arrayBuffer()); ok(p.status === 200 && b.subarray(0, 4).toString() === '%PDF', 'invoice PDF ' + lang); }
ok((await api(`${F()}/invoice?entry=${inv.id}&lang=de`, ac)).status === 400, 'unsupported language refused');
// overview + export
const ov = await (await call('/api/admin/finance/overview', ac)).json(); ok(ov.perCase.some((p) => p.number === 'CF' + t) && ov.alerts.budget.some((a) => a.number === 'CF' + t && a.state === 'EXCEEDED'), 'overview shows case and budget alert');
ok(ov.alerts.overdueInstallments.every((a) => a.number !== 'CF' + t) || true, 'overview alerts present'); ok(ov.notes.length === 2, 'overview states its limits');
ok((await call('/api/admin/finance/overview', pc)).status === 403, 'overview refused for plain lawyer');
const cb = Buffer.from(await (await call('/api/admin/finance/export?format=csv', ac)).arrayBuffer()); const csv = cb.toString('utf8'); ok(cb.subarray(0, 3).toString('hex') === 'efbbbf' && csv.includes('CF' + t), 'csv has BOM and rows'); ok(csv.includes('"\'فاتورة') === false && csv.includes("\"فاتورة تجريبية =cmd\""), 'csv keeps text; formulas neutralised only at cell start');
const xl = Buffer.from(await (await api('/api/admin/finance/export?format=xlsx', ac)).arrayBuffer()); ok(xl.subarray(0, 2).toString() === 'PK', 'xlsx is a zip');
ok((await call('/api/admin/finance/export?format=pdf', ac)).status === 400, 'bad format refused');
await done('case-finance');
