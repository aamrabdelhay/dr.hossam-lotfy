import { NextResponse } from 'next/server';
import { ApiError, handle } from '@/lib/api';
import { visibleFinance } from '@/lib/finance-overview';
import { createXlsx } from '@/lib/xlsx';
export const dynamic = 'force-dynamic';
const HEAD = ['entry_id', 'case_number', 'branch', 'kind', 'amount', 'currency', 'due_on', 'status', 'ref_id', 'note', 'created_at'];
const csvCell = (v: unknown) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replaceAll('"', '""') + '"'; };
/** Accountant export (item 201): CSV (UTF-8 with BOM, formula-safe cells) or XLSX of the ledger rows for the cases the caller may see. */
export const GET = handle(async (req: Request) => {
  const fmt = new URL(req.url).searchParams.get('format') ?? 'csv'; if (fmt !== 'csv' && fmt !== 'xlsx') throw new ApiError(400, 'الصيغة csv أو xlsx');
  const { cases, rows } = await visibleFinance(); const cm = new Map(cases.map((c) => [c.id, c]));
  const data = rows.map((r) => [r.id, cm.get(r.case_id)?.number ?? '', cm.get(r.case_id)?.branch_id ?? '', r.kind, r.amount, r.currency, r.due_on ?? '', r.status, r.ref_id ?? '', r.note ?? '', r.created_at]);
  if (fmt === 'xlsx') return new NextResponse(new Uint8Array(createXlsx(HEAD, data, 'Finance', { language: 'en' })), { headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'content-disposition': 'attachment; filename="finance.xlsx"' } });
  return new NextResponse('\uFEFF' + [HEAD, ...data].map((r) => r.map(csvCell).join(',')).join('\r\n'), { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="finance.csv"' } });
});
