import { handle, json } from '@/lib/api';
import { overview, visibleFinance } from '@/lib/finance-overview';
export const dynamic = 'force-dynamic';
/** Profitability by case, branch and client (item 199) plus budget and installment alerts (items 193, 202). Counts the cases the caller may see. */
export const GET = handle(async () => { const { cases, rows } = await visibleFinance(); return json(overview(cases, rows, new Date().toISOString().slice(0, 10))); });
