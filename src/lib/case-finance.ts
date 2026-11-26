/** Case finance maths (items 193-199, 202, 203). Pure functions over ledger rows, so every number is testable. Amounts are numeric strings from the database; cents are used internally to avoid float drift. */
export type FinRow = { id: string; case_id: string; kind: string; amount: string | number; currency: string; due_on: string | null; status: string; ref_id: string | null; note: string | null; created_at: string };
const c = (v: string | number) => Math.round(Number(v) * 100);
const live = (r: FinRow) => r.status !== 'CANCELLED' && r.status !== 'REJECTED';
export const fmt = (cents: number) => (cents / 100).toFixed(2);
export function summarize(rows: FinRow[]) {
  const sum = (kind: string, pred: (r: FinRow) => boolean = () => true) => rows.filter((r) => r.kind === kind && live(r) && pred(r)).reduce((k, r) => k + c(r.amount), 0);
  const agreed = sum('FEE_AGREEMENT'); const extra = sum('EXTRA_SCOPE', (r) => r.status === 'ACCEPTED');
  const invoiced = sum('INVOICE'); const paid = sum('PAYMENT');
  const expenses = sum('EXPENSE'); const reimbursed = sum('EXPENSE', (r) => r.status === 'REIMBURSED');
  const budget = rows.filter((r) => r.kind === 'BUDGET' && live(r)).reduce((k, r) => Math.max(k, c(r.amount)), 0);
  const trust = sum('TRUST_IN') - sum('TRUST_OUT');
  return { agreed, extraAccepted: extra, invoiced, paid, outstanding: Math.max(0, invoiced - paid), unbilledFees: Math.max(0, agreed + extra - invoiced), expenses, expensesNotReimbursed: expenses - reimbursed, budget, trustBalance: trust,
    budgetUsedPct: budget > 0 ? Math.round((expenses * 1000) / budget) / 10 : null, budgetState: budget === 0 ? 'NO_BUDGET' : expenses > budget ? 'EXCEEDED' : expenses * 100 >= budget * 80 ? 'NEAR' : 'OK' as 'NO_BUDGET' | 'EXCEEDED' | 'NEAR' | 'OK' };
}
/** Overdue installments: OPEN and due before `today` (YYYY-MM-DD). Also due within `soonDays`. */
export function installmentAlerts(rows: FinRow[], today: string, soonDays = 7) {
  const soon = new Date(today + 'T00:00:00Z'); soon.setUTCDate(soon.getUTCDate() + soonDays); const lim = soon.toISOString().slice(0, 10);
  const open = rows.filter((r) => r.kind === 'INSTALLMENT' && r.status === 'OPEN' && r.due_on);
  return { overdue: open.filter((r) => r.due_on! < today), dueSoon: open.filter((r) => r.due_on! >= today && r.due_on! <= lim) };
}
/** Client statement (item 197): chronological lines with a running balance owed by the client (invoices and unreimbursed expenses add, payments subtract). Trust money is a separate balance and never offsets fees here. */
export function statement(rows: FinRow[]) {
  const lines = rows.filter((r) => live(r) && ['INVOICE', 'PAYMENT', 'EXPENSE'].includes(r.kind) && !(r.kind === 'EXPENSE' && r.status === 'REIMBURSED')).sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  let bal = 0; return lines.map((r) => { bal += r.kind === 'PAYMENT' ? -c(r.amount) : c(r.amount); return { id: r.id, kind: r.kind, date: String(r.created_at).slice(0, 10), amount: fmt(c(r.amount)), balance: fmt(bal), note: r.note }; });
}
/** Reconciliation flags (item 197): things a person must check, never fixed automatically. */
export function reconcile(rows: FinRow[]) {
  const s = summarize(rows); const flags: string[] = [];
  if (s.paid > s.invoiced) flags.push('PAID_MORE_THAN_INVOICED'); if (s.trustBalance < 0) flags.push('TRUST_NEGATIVE');
  if (s.budgetState === 'EXCEEDED') flags.push('BUDGET_EXCEEDED'); if (s.expensesNotReimbursed > 0) flags.push('EXPENSES_NOT_REIMBURSED');
  return flags;
}
/** Item 199: profitability per case = payments received minus expenses not reimbursed. Time cost is NOT included (no hourly cost rate is recorded), and the output says so. */
export function profit(rows: FinRow[]) { const s = summarize(rows); return { received: s.paid, expensesNotReimbursed: s.expensesNotReimbursed, net: s.paid - s.expensesNotReimbursed, timeCostIncluded: false }; }
export const INVOICE_TEXT = {
  ar: { invoice: 'فاتورة', receipt: 'إيصال', case: 'القضية', date: 'التاريخ', amount: 'المبلغ', total: 'الإجمالي', note: 'ملاحظة', footer: 'Loutfi Law firm' },
  en: { invoice: 'Invoice', receipt: 'Receipt', case: 'Case', date: 'Date', amount: 'Amount', total: 'Total', note: 'Note', footer: 'Loutfi Law firm' },
  fr: { invoice: 'Facture', receipt: 'Reçu', case: 'Dossier', date: 'Date', amount: 'Montant', total: 'Total', note: 'Remarque', footer: 'Loutfi Law firm' },
} as const;
export type Lang = keyof typeof INVOICE_TEXT;
