/**
 * Date & urgency utilities. All Arabic formatting uses Intl (ar-EG) which
 * produces Arabic-Indic digits and correct Arabic day/month names.
 */

export type Urgency = 'past' | 'today' | 'tomorrow' | 'critical' | 'important' | 'upcoming' | 'normal';

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Whole calendar days from today until `date` (negative = past). */
export function daysUntil(date: Date): number {
  const a = startOfToday().getTime();
  const b = new Date(date);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a) / 86400000);
}

/**
 * Urgency of a scheduled date:
 *  - tomorrow:  today or tomorrow (highest)
 *  - critical:  within 3 days
 *  - important: within 14 days
 *  - upcoming:  within 30 days
 *  - normal:    further
 */
export function urgencyOf(date: Date | null | undefined): Urgency {
  if (!date) return 'normal';
  const d = daysUntil(date);
  if (d < 0) return 'past';
  if (d <= 1) return 'tomorrow';
  if (d <= 3) return 'critical';
  if (d <= 14) return 'important';
  if (d <= 30) return 'upcoming';
  return 'normal';
}

export const URGENCY_LABEL: Record<Urgency, string> = {
  past: 'منتهية',
  today: 'اليوم',
  tomorrow: 'غداً / اليوم',
  critical: 'حرجة',
  important: 'مهمة',
  upcoming: 'قريبة',
  normal: 'عادية',
};

const dayFmt = new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
const fullFmt = new Intl.DateTimeFormat('ar-EG', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const shortFmt = new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short' });
const monthFmt = new Intl.DateTimeFormat('ar-EG', { month: 'long', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
const timeFmt = new Intl.DateTimeFormat('ar-EG', { hour: '2-digit', minute: '2-digit' });

/** "الخميس 27 أغسطس" */
export function formatDay(date: Date): string {
  return dayFmt.format(date);
}

/** "الخميس، 27 أغسطس 2026" */
export function formatFullDate(date: Date): string {
  return fullFmt.format(date);
}

/** "27 أغسطس" */
export function formatShortDate(date: Date): string {
  return shortFmt.format(date);
}

/** "أغسطس 2026" */
export function formatMonthYear(date: Date): string {
  return monthFmt.format(date);
}

/** "27 أغسطس، 10:30 ص" */
export function formatDateTime(date: Date): string {
  return dateTimeFmt.format(date);
}

/** "10:30 ص" */
export function formatClock(date: Date): string {
  return timeFmt.format(date);
}

/** Convert "10:00" (24h) → "10:00 صباحاً" */
export function formatTimeOfDay(time?: string | null): string | null {
  if (!time) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return time;
  const h = Number(m[1]);
  const min = m[2];
  const period = h < 12 ? 'صباحاً' : 'مساءً';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const num = new Intl.NumberFormat('ar-EG').format;
  return `${num(h12)}:${min} ${period}`;
}

/** Relative Arabic time: "منذ ٣ أيام" / "قبل ساعة" */
export function formatRelative(date: Date): string {
  const rtf = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' });
  const diffMs = date.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const min = 60000;
  const hour = 3600000;
  const day = 86400000;
  if (abs < hour) return rtf.format(Math.round(diffMs / min), 'minute');
  if (abs < day) return rtf.format(Math.round(diffMs / hour), 'hour');
  if (abs < 30 * day) return rtf.format(Math.round(diffMs / day), 'day');
  return formatShortDate(date);
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
