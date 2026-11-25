import 'server-only';

import { timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/prisma';

export const PUBLIC_MODES = ['office', 'phone', 'video'] as const;

type BookingConfig = {
  days: number[];
  start: number;
  end: number;
  branches: string[];
};

export function publicSecretOk(req: Request): boolean {
  const expected = process.env.APPOINTMENT_INGEST_SECRET?.trim();
  const received = req.headers.get('x-appointment-secret')?.trim() || '';
  if (!expected || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function enabledBranches(): string[] {
  return Array.from(new Set(
    (process.env.PUBLIC_BOOKING_BRANCHES || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  ));
}

/** Returns null unless every booking setting is explicitly and validly configured. */
function bookingConfig(): BookingConfig | null {
  const daysRaw = process.env.PUBLIC_BOOKING_DAYS?.trim();
  const startRaw = process.env.PUBLIC_BOOKING_START?.trim();
  const endRaw = process.env.PUBLIC_BOOKING_END?.trim();
  const branches = enabledBranches();

  if (!daysRaw || !startRaw || !endRaw || branches.length === 0) return null;

  const dayTokens = daysRaw.split(',').map((value) => value.trim());
  if (dayTokens.length === 0 || dayTokens.some((value) => !/^[0-6]$/.test(value))) return null;

  const days = Array.from(new Set(dayTokens.map(Number)));
  const start = Number(startRaw);
  const end = Number(endRaw);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start > 23 || end <= start || end > 24) {
    return null;
  }

  return { days, start, end, branches };
}

export function bookingConfigured(branch?: string | null): boolean {
  const config = bookingConfig();
  if (!config) return false;
  return branch ? config.branches.includes(branch) : config.branches.length > 0;
}

/** A configured branch must also exist and be active in the office database. */
export async function publicBranchIsActive(branchId: string): Promise<boolean> {
  if (!bookingConfigured(branchId)) return false;
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    'SELECT "id" FROM "office_branches" WHERE "id"=$1 AND "active"=true LIMIT 1',
    branchId,
  );
  return Boolean(rows[0]);
}

export function slotsForDate(date: string, branch?: string | null): string[] {
  const config = bookingConfig();
  if (!config || !branch || !config.branches.includes(branch)) return [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];

  const d = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== date) return [];
  if (!config.days.includes(d.getUTCDay())) return [];

  const out: string[] = [];
  for (let hour = config.start; hour < config.end; hour += 1) {
    out.push(`${String(hour).padStart(2, '0')}:00`);
  }
  return out;
}

/** Today in Africa/Cairo as YYYY-MM-DD. */
export function cairoToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());
}

/** "10:30" and "10:00" share the 10:00 hourly slot. */
export function slotHour(time: string | null | undefined): string {
  return (time || '').slice(0, 2);
}

/** A legacy appointment without a branch blocks that hour for every public branch. */
export const SLOT_CONFLICT_SQL = `SELECT 1
  FROM "client_appointments"
  WHERE ("branch_id" = $1 OR "branch_id" IS NULL)
    AND "appointment_date" = $2::date
    AND "status" <> 'CANCELLED'
    AND LEFT("appointment_time", 2) = $3
    AND "id" <> COALESCE($4, '')
  LIMIT 1`;
