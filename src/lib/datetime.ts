import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { APP_TIMEZONE } from "./constants";

/**
 * Date handling conventions
 * ---------------------------------------------------------------------------
 * - All "day" values (work sessions, week starts, transaction days) are stored
 *   as UTC midnight of the calendar day in APP_TIMEZONE. This makes Prisma
 *   `@@unique([date, ...])` grouping stable regardless of the server timezone.
 * - All display formatting goes through `formatInTimeZone` so the UI always
 *   shows Africa/Addis_Ababa time.
 */

export const MS_PER_DAY = 86_400_000;

/** Wall-clock time rendered in the app timezone. */
export function zonedNow(): Date {
  return toZonedTime(new Date(), APP_TIMEZONE);
}

export function formatDate(
  value: Date | string | number,
  pattern = "MMM d, yyyy",
): string {
  return formatInTimeZone(new Date(value), APP_TIMEZONE, pattern);
}

export function formatDateTime(
  value: Date | string | number,
  pattern = "MMM d, yyyy HH:mm",
): string {
  return formatInTimeZone(new Date(value), APP_TIMEZONE, pattern);
}

export function formatTime(
  value: Date | string | number,
  pattern = "HH:mm",
): string {
  return formatInTimeZone(new Date(value), APP_TIMEZONE, pattern);
}

/** Calendar date in the app timezone, as a UTC-midnight Date. */
export function zonedDateOnly(value: Date | string | number = new Date()): Date {
  const ymd = formatInTimeZone(new Date(value), APP_TIMEZONE, "yyyy-MM-dd");
  return new Date(`${ymd}T00:00:00.000Z`);
}

export function todayDateOnly(): Date {
  return zonedDateOnly(new Date());
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

/** 0 = Sunday … 6 = Saturday, evaluated on the UTC-normalized day. */
export function getDayOfWeek(date: Date): number {
  return date.getUTCDay();
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getTime() === b.getTime();
}

/** Monday 00:00 UTC of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const d = zonedDateOnly(date);
  const day = d.getUTCDay();
  const diff = (day + 6) % 7; // days elapsed since Monday
  return addDays(d, -diff);
}

/** Sunday 00:00 UTC of the week containing `date`. */
export function endOfWeek(date: Date): Date {
  return addDays(startOfWeek(date), 6);
}

export function startOfMonth(date: Date): Date {
  const d = zonedDateOnly(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function endOfMonth(date: Date): Date {
  const d = zonedDateOnly(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
}

/** Stable key for a week, e.g. "2026-W03-Mon" for grouping / unique lookups. */
export function weekKey(date: Date): string {
  return startOfWeek(date).toISOString().slice(0, 10);
}

/** The Saturday on which the coming week is planned (2 days before Monday). */
export function planningSaturday(weekStartMonday: Date): Date {
  return addDays(startOfWeek(weekStartMonday), -2);
}

/** The Saturday on which the week's accountability report is due (Mon + 5). */
export function reportingSaturday(weekStartMonday: Date): Date {
  return addDays(startOfWeek(weekStartMonday), 5);
}

export function formatWeekRange(weekStartMonday: Date): string {
  const start = startOfWeek(weekStartMonday);
  const end = addDays(start, 4); // Friday
  return `${formatDate(start, "MMM d")} – ${formatDate(end, "MMM d, yyyy")}`;
}

export function formatMonth(date: Date): string {
  return formatDate(date, "MMMM yyyy");
}
