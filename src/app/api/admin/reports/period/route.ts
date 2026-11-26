import { NextResponse } from 'next/server';
import { ApiError, actorOf, handle, json } from '@/lib/api';
import { isFinanceManagement, isSeniorManagement } from '@/lib/office-workflow';
import { periodReport } from '@/lib/period-report';
import { prisma } from '@/lib/prisma';
import { createXlsx } from '@/lib/xlsx';
export const dynamic = 'force-dynamic';
/** Monthly comparison by branch (item 212) and yearly report (item 213): ?from=YYYY-MM&to=YYYY-MM[&format=xlsx]. Senior management only; finance columns need finance management too. Counts only. A report is generated on request, never emailed automatically. */
export const GET = handle(async (req: Request) => {
  const s = await actorOf(); if (!(await isSeniorManagement(s))) throw new ApiError(403, 'للإدارة العليا فقط');
  const sp = new URL(req.url).searchParams; const from = sp.get('from') ?? ''; const to = sp.get('to') ?? from;
  let r; try { r = await periodReport(from, to, await isFinanceManagement(s)); } catch (e) { throw new ApiError(400, (e as Error).message); }
  if (sp.get('format') === 'xlsx') { const head = ['month', 'branch', 'tasks_created', 'tasks_completed', 'tasks_completed_change', 'files_uploaded', 'files_uploaded_change', 'invoiced', 'received']; return new NextResponse(new Uint8Array(createXlsx(head, r.rows.map((x) => [x.month, x.branch, x.tasksCreated, x.tasksCompleted, x.tasksCompletedDelta ?? '', x.filesUploaded, x.filesUploadedDelta ?? '', x.invoiced ?? '', x.received ?? '']), 'Report', { language: 'en' })), { headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'content-disposition': 'attachment; filename="period-report.xlsx"' } }); }
  const bn = await prisma.$queryRawUnsafe<{ id: string; name_ar: string }[]>(`SELECT "id","name_ar" FROM "office_branches"`).catch(() => []);
  return json({ ...r, branchNames: Object.fromEntries(bn.map((b) => [b.id, b.name_ar])) });
});
