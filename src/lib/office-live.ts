import 'server-only';

import { prisma } from '@/lib/prisma';
import type { SessionUser } from '@/lib/auth';
import { getBranchScope } from '@/lib/branch-access';
import { isOfficeManager, isSeniorManagement } from '@/lib/office-workflow';
import { computeLawyerStatus, type LiveTask, type OfficeLivePayload, type SessionTap } from '@/lib/office-live-core';

export type { OfficeLivePayload, OfficeLiveRow } from '@/lib/office-live-core';

export function cairoDay(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

export async function canSeeOfficeLive(session: SessionUser | null): Promise<boolean> {
  if (!session) return false;
  return (await isSeniorManagement(session)) || (await isOfficeManager(session));
}

export async function getOfficeLive(session: SessionUser): Promise<OfficeLivePayload> {
  if (!(await canSeeOfficeLive(session))) throw new Error('forbidden');

  const day = cairoDay();
  const senior = await isSeniorManagement(session);
  const scope = senior ? null : await getBranchScope(session);
  const branchIds = senior ? [] : (scope?.officeManagerBranchIds ?? []);

  const lawyers = await prisma.$queryRawUnsafe<Array<{ id: string; fullName: string; position: string | null }>>(
    `SELECT l."id", l."fullName", l."position" FROM "lawyers" l
      WHERE l."active" = true AND l."approvedAt" IS NOT NULL
        AND ($1::boolean OR EXISTS (
          SELECT 1 FROM "office_branch_lawyers" bl
           WHERE bl."lawyer_id" = l."id" AND bl."branch_id" = ANY($2::text[])
        ))
      ORDER BY l."sortOrder" ASC NULLS LAST, l."fullName" ASC`,
    senior, branchIds,
  );
  const lawyerIds = lawyers.map((lawyer) => lawyer.id);
  if (!lawyerIds.length) return { generatedAt: new Date().toISOString(), day, rows: [] };

  const [officeRows, tapRows, taskRows] = await Promise.all([
    prisma.$queryRawUnsafe<Array<{ lawyer_id: string; in_at: Date; out_at: Date | null }>>(
      `SELECT "lawyer_id", "in_at", "out_at" FROM "office_staff_attendance"
        WHERE "day" = $1::date AND "lawyer_id" = ANY($2::text[]) ORDER BY "in_at" DESC`, day, lawyerIds,
    ),
    prisma.$queryRawUnsafe<Array<{ lawyer_id: string; task_id: string; kind: 'ARRIVE' | 'DEPART'; at: Date }>>(
      `SELECT "lawyer_id", "task_id", "kind", "at" FROM "office_session_attendance"
        WHERE ("at" AT TIME ZONE 'Africa/Cairo')::date = $1::date
          AND "lawyer_id" = ANY($2::text[]) ORDER BY "at" ASC`, day, lawyerIds,
    ),
    prisma.$queryRawUnsafe<Array<{
      lawyer_id: string; id: string; description: string; time: string | null;
      location: string | null; case_name: string | null; case_number: string | null;
    }>>(
      `SELECT a."lawyerId" AS lawyer_id, t."id", t."description",
              t."scheduledTime" AS time, loc."name" AS location,
              c."name" AS case_name, c."number" AS case_number
         FROM "task_assignments" a
         JOIN "tasks" t ON t."id" = a."taskId"
         LEFT JOIN "locations" loc ON loc."id" = t."locationId"
         LEFT JOIN "case_records" c ON c."id" = t."caseId"
        WHERE a."lawyerId" = ANY($1::text[])
          AND a."completedAt" IS NULL AND t."status" IN ('PENDING', 'IN_PROGRESS')
          AND t."scheduledDate"::date = $2::date
          AND ($3::boolean OR COALESCE(t."branch_id", 'branch_main') = ANY($4::text[]))
        ORDER BY t."scheduledTime" ASC NULLS LAST, t."createdAt" ASC`,
      lawyerIds, day, senior, branchIds,
    ),
  ]);

  const toLiveTask = (row: {
    id: string; description: string; time: string | null; location: string | null;
    case_name: string | null; case_number: string | null;
  }): LiveTask => {
    const caseLabel = [row.case_name?.trim(), row.case_number?.trim()].filter(Boolean).join(' — ');
    return {
      id: row.id, description: String(row.description ?? '').slice(0, 140),
      locationName: row.location?.trim() || 'مكان غير محدد', time: row.time, caseLabel: caseLabel || null,
    };
  };

  const tappedTaskIds = [...new Set(tapRows.map((tap) => tap.task_id))];
  const tappedTasks = tappedTaskIds.length
    ? await prisma.$queryRawUnsafe<Array<{
        id: string; description: string; time: string | null; location: string | null;
        case_name: string | null; case_number: string | null;
      }>>(
        `SELECT t."id", t."description", t."scheduledTime" AS time,
                loc."name" AS location, c."name" AS case_name, c."number" AS case_number
           FROM "tasks" t
           LEFT JOIN "locations" loc ON loc."id" = t."locationId"
           LEFT JOIN "case_records" c ON c."id" = t."caseId"
          WHERE t."id" = ANY($1::text[])
            AND ($2::boolean OR COALESCE(t."branch_id", 'branch_main') = ANY($3::text[]))`,
        tappedTaskIds, senior, branchIds,
      )
    : [];

  const taskById: Record<string, LiveTask> = {};
  for (const row of tappedTasks) taskById[row.id] = toLiveTask(row);

  const rows = lawyers.map((lawyer) => {
    const myOfficeRows = officeRows.filter((row) => row.lawyer_id === lawyer.id);
    const officeToday = myOfficeRows.find((row) => row.out_at === null) ?? myOfficeRows[0];
    const myTaps: SessionTap[] = tapRows
      .filter((tap) => tap.lawyer_id === lawyer.id)
      .map((tap) => ({ taskId: tap.task_id, kind: tap.kind, at: new Date(tap.at).toISOString() }));
    const status = computeLawyerStatus({
      taps: myTaps,
      officeIn: officeToday ? new Date(officeToday.in_at).toISOString() : null,
      officeOut: officeToday?.out_at ? new Date(officeToday.out_at).toISOString() : null,
      taskById,
    });
    const assignedTasks = taskRows.filter((task) => task.lawyer_id === lawyer.id).map(toLiveTask);
    return {
      lawyerId: lawyer.id, name: lawyer.fullName, position: lawyer.position, status,
      tasks: assignedTasks.slice(0, 5), moreTasks: Math.max(0, assignedTasks.length - 5),
    };
  });
  return { generatedAt: new Date().toISOString(), day, rows };
}
