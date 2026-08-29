import { after } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getFeed, toTaskVM, type TaskVM } from '@/lib/queries';
import { handle, json, readJson, user } from '@/lib/api';
import { can } from '@/lib/rbac';
import { logActivity } from '@/lib/activity';
import { notifyTaskAssigned, notifyPostCreated } from '@/lib/notifications';
import { formatDay } from '@/lib/dates';
import { isMailConfigured, notifyOfficeTaskCreated, officeCcRecipients, sendTaskAssignedEmail } from '@/lib/mail';
import { appOrigin } from '@/lib/google-oauth';
import { isDemoMode, DEMO_TAG } from '@/lib/demo-mode';

export const GET = handle(async (req: Request) => { const session = await user(); if (!session) return json({ error: 'يجب تسجيل الدخول لعرض مهام المكتب' }, { status: 401 }); const url = new URL(req.url); const { items, total } = await getFeed({ lawyerId: url.searchParams.get('lawyerId') ?? undefined, locationId: url.searchParams.get('locationId') ?? undefined, status: url.searchParams.get('status') ?? undefined, from: url.searchParams.get('from') ?? undefined, to: url.searchParams.get('to') ?? undefined, q: url.searchParams.get('q') ?? undefined, limit: Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '30', 10) || 30)), offset: Math.max(0, parseInt(url.searchParams.get('offset') ?? '0', 10) || 0) }); return json({ items, total }); });

const createSchema = z.object({ locationId: z.string().min(1).optional(), description: z.string().trim().min(1, 'اسم التكليف مطلوب').max(2000), notes: z.string().max(4000).optional(), caseName: z.string().max(300).optional(), caseNumber: z.string().max(200).optional(), clientName: z.string().max(200).optional(), clientId: z.string().max(100).optional(), scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاريخ غير صالح').optional(), scheduledTime: z.string().regex(/^\d{2}:\d{2}$/, 'ساعة غير صالحة').optional(), lawyerIds: z.array(z.string()).max(20).optional(), ownPost: z.boolean().optional() });

export const POST = handle(async (req: Request) => {
  const session = await user(); if (!session) return json({ error: 'يجب تسجيل الدخول لإضافة مهمة' }, { status: 401 }); const demo = await isDemoMode(); const data = await readJson(req as never, createSchema); const isOwnPost = !!data.ownPost && session.role === 'lawyer'; const isAdminCreate = session.role === 'admin';
  if (isAdminCreate && !can(session.userRole, 'writeTasks')) return json({ error: 'لا تملك صلاحية إضافة مهمة' }, { status: 403 }); if (!isOwnPost && !isAdminCreate) return json({ error: 'لا تملك صلاحية إضافة مهمة' }, { status: 403 });
  const createdById = session.role === 'admin' ? session.userId : null;
  if (!data.locationId && !data.lawyerIds?.length && !data.caseName && !data.caseNumber && !data.scheduledDate && !data.scheduledTime && !data.clientId) {
    const id = `task_${crypto.randomUUID().replaceAll('-', '')}`;
    await prisma.$executeRawUnsafe(`INSERT INTO "tasks" ("id","description","notes","status","createdById","createdAt","updatedAt") VALUES ($1,$2,$3,'PENDING',$4,NOW(),NOW())`, id, data.description, data.notes?.trim() || null, createdById);
    await logActivity({ action: 'CREATED', summary: `أنشأ تكليفاً جديداً: ${data.description.slice(0, 80)}`, taskId: id, byUserId: createdById ?? undefined }).catch(() => undefined);
    return json({ ok: true, task: { id, description: data.description, notes: data.notes?.trim() || null, status: 'PENDING' }, createdCount: 0, standalone: true, demo });
  }
  if (data.locationId) { const location = await prisma.location.findUnique({ where: { id: data.locationId } }); if (!location) return json({ error: 'المكان غير موجود' }, { status: 404 }); }
  let caseId: string | undefined;
  if (data.caseName || data.caseNumber) {
    const name = data.caseName ?? ''; const number = data.caseNumber ?? '';
    const textWhere = demo ? { name: { contains: DEMO_TAG } } : { name: { not: { contains: DEMO_TAG } } };
    let existing = null as { id: string; clientName: string | null } | null;
    if (name && number) existing = await prisma.caseRecord.findFirst({ where: { AND: [{ name }, { number }, textWhere] }, select: { id: true, clientName: true } });
    if (!existing && number) existing = await prisma.caseRecord.findFirst({ where: { AND: [{ number }, textWhere] }, select: { id: true, clientName: true } });
    caseId = existing?.id ?? undefined;
    if (!existing) { const c = await prisma.caseRecord.create({ data: { name: demo ? `${name} ${DEMO_TAG}`.trim() : name, number: demo ? `DEMO-${number}` : number, clientName: data.clientName?.trim() || null } }); caseId = c.id; }
    else if (data.clientName?.trim() && !existing.clientName) await prisma.caseRecord.update({ where: { id: existing.id }, data: { clientName: data.clientName.trim() } }).catch(() => undefined);
  }
  const lawyerIds = isOwnPost ? [session.lawyerId] : (data.lawyerIds ?? []);
  const lawyers = lawyerIds.length ? await prisma.lawyer.findMany({ where: { id: { in: lawyerIds }, active: true } }) : [];
  if (lawyers.length !== new Set(lawyerIds).size) return json({ error: 'أحد المحامين المحددين غير موجود أو غير نشط' }, { status: 400 });
  const taskData = {
    ...(data.locationId ? { locationId: data.locationId } : {}),
    ...(caseId ? { caseId } : {}),
    description: `${data.description.trim()}${demo ? ` ${DEMO_TAG}` : ''}`.trim(),
    ...(data.notes?.trim() ? { notes: data.notes.trim() } : {}),
    ...(data.scheduledDate ? { scheduledDate: new Date(`${data.scheduledDate}T00:00:00`) } : {}),
    ...(data.scheduledTime ? { scheduledTime: data.scheduledTime } : {}),
    ...(isOwnPost && session.lawyerId ? { authorId: session.lawyerId } : {}),
    ...(createdById ? { createdById } : {}),
    assignees: { create: lawyerIds.map((lawyerId) => ({ lawyerId })) },
  };
  const task = await prisma.task.create({ data: taskData, include: { location: true, caseRecord: true, author: { select: { id: true, fullName: true, title: true, slug: true, profilePhotoUrl: true } }, assignees: { select: { lawyer: { select: { id: true, fullName: true, title: true, slug: true, profilePhotoUrl: true } }, completedAt: true } }, comments: { select: { createdAt: true } } } });
  const when = task.scheduledDate ? `${formatDay(task.scheduledDate)}${task.scheduledTime ? ` — ${task.scheduledTime}` : ''}` : 'بالتنسيق'; await logActivity({ action: 'CREATED', summary: `أنشأ مهمة جديدة: ${(task.description || data.locationId || '').slice(0, 80)}`, taskId: task.id, locationId: data.locationId, byUserId: createdById ?? undefined, byLawyerId: isOwnPost ? session.lawyerId : undefined }).catch(() => undefined); if (lawyerIds.length) await notifyTaskAssigned(lawyerIds, task.description.slice(0, 60), when, `/sessions/${task.id}`).catch(() => undefined); if (isOwnPost) await notifyPostCreated(task.id, session.name, task.description.slice(0, 60), task.location?.name ?? '').catch(() => undefined);
  if (isMailConfigured() && !demo && lawyers.length) { const taskDesc = task.description.slice(0, 120); const dateLabel = task.scheduledDate ? formatDay(task.scheduledDate) : ''; const timeLabel = task.scheduledTime ?? ''; const url = `${appOrigin()}/sessions/${task.id}`; const assigneeNames = lawyers.map((l) => l.fullName); const caseLabel = task.caseRecord ? `${task.caseRecord.name} — ${task.caseRecord.number}` : null; const clientName = task.caseRecord?.clientName ?? data.clientName?.trim() ?? null; const mailTargets = lawyers.map((l) => ({ to: (l.googleEmail ?? l.email)?.trim(), name: l.fullName })).filter((x): x is { to: string; name: string } => !!x.to); after(async () => { try { await notifyOfficeTaskCreated({ taskDesc, locationName: task.location?.name ?? 'تكليف عام', dateLabel, timeLabel, assignees: assigneeNames, clientName, caseLabel, createdBy: session.name, url }); const principal = await prisma.lawyer.findFirst({ where: { isPrincipal: true, active: true } }); const cc = officeCcRecipients(principal?.googleEmail ?? principal?.email ?? null); for (const target of mailTargets) await sendTaskAssignedEmail({ to: target.to, cc, lawyerName: target.name, taskDesc, locationName: task.location?.name ?? 'تكليف عام', dateLabel, timeLabel, url }); } catch (err) { console.error('[tasks] post-response mail failed:', (err as Error)?.message ?? err); } }); }
  return json({ ok: true, task: toTaskVM(task as never) as TaskVM, createdCount: lawyerIds.length, demo });
});
