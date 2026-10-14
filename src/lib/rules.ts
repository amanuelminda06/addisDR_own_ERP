import {
  PLANNED_HOURS_PER_DAY,
  PLANNED_HOURS_PER_WEEK,
  SESSION_MINUTES,
  SESSIONS_PER_WORKDAY,
  WORKDAYS,
} from "./constants";
import { getDayOfWeek, startOfWeek, addDays, zonedNow } from "./datetime";
import { toNumber } from "./utils";

/**
 * Pure business rules for AddisDR ERP.
 * These functions are intentionally free of I/O so they can be unit tested.
 */

/** A workday is Monday–Friday. `date` is assumed UTC-normalized. */
export function isWorkday(date: Date): boolean {
  return (WORKDAYS as readonly number[]).includes(getDayOfWeek(date));
}

/** Number of workdays in the Monday-start week containing `date`. */
export function workdaysInWeek(date: Date): number {
  const start = startOfWeek(date);
  let count = 0;
  for (let i = 0; i < 7; i++) {
    if (isWorkday(addDays(start, i))) count++;
  }
  return count;
}

export function plannedHoursForSessions(sessions: number): number {
  return (toNumber(sessions) * SESSION_MINUTES) / 60;
}

/** Nine planned hours per workday, forty-five per full week. */
export const dailyPlannedHours = PLANNED_HOURS_PER_DAY;
export const weeklyPlannedHours = PLANNED_HOURS_PER_WEEK;

export type AllowanceStatus = {
  limit: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  overLimit: boolean;
  level: "safe" | "warning" | "critical" | "over";
};

/**
 * Personal spending against the monthly allowance.
 * Warning at 75%, critical at 90%, over at 100%.
 */
export function allowanceStatus(
  spent: unknown,
  limit: unknown,
): AllowanceStatus {
  const limitNum = toNumber(limit);
  const spentNum = toNumber(spent);
  const remaining = limitNum - spentNum;
  const percentUsed = limitNum > 0 ? spentNum / limitNum : 0;

  let level: AllowanceStatus["level"] = "safe";
  if (spentNum > limitNum) level = "over";
  else if (percentUsed >= 0.9) level = "critical";
  else if (percentUsed >= 0.75) level = "warning";

  return {
    limit: limitNum,
    spent: spentNum,
    remaining,
    percentUsed,
    overLimit: spentNum > limitNum,
    level,
  };
}

export type AllocationRule = {
  category: "TAX" | "TITHE" | "SAVINGS" | "BUSINESS" | "PERSONAL" | "OTHER";
  method: "FIXED" | "PERCENT";
  value: number;
  isActive: boolean;
};

export type AllocationResult = {
  category: AllocationRule["category"];
  amount: number;
};

/**
 * Split a revenue amount across active allocation rules.
 * TAX, TITHE, BUSINESS and SAVINGS are reserved before PERSONAL spending.
 * Percentage values are treated as percentages of the given amount.
 */
export function computeAllocations(
  amount: unknown,
  rules: AllocationRule[],
): { allocations: AllocationResult[]; totalReserved: number; unallocated: number } {
  const base = toNumber(amount);
  const allocations: AllocationResult[] = [];

  for (const rule of rules) {
    if (!rule.isActive) continue;
    const value = toNumber(rule.value);
    const computed = rule.method === "FIXED" ? value : (base * value) / 100;
    allocations.push({ category: rule.category, amount: computed });
  }

  const totalReserved = allocations
    .filter((a) => a.category !== "PERSONAL")
    .reduce((sum, a) => sum + a.amount, 0);

  return {
    allocations,
    totalReserved,
    unallocated: base - totalReserved,
  };
}

/** Net profit = total income − total expenses. */
export function netProfit(income: unknown, expenses: unknown): number {
  return toNumber(income) - toNumber(expenses);
}

export type ReminderLike = {
  status: "PENDING" | "COMPLETED" | "OVERDUE" | "DISMISSED";
  dueAt: Date | string;
};

/**
 * Effective reminder status. A pending reminder whose due date has passed is
 * reported as OVERDUE without mutating the persisted record.
 */
export function effectiveReminderStatus(
  reminder: ReminderLike,
  now: Date = zonedNow(),
): ReminderLike["status"] {
  if (reminder.status !== "PENDING") return reminder.status;
  return new Date(reminder.dueAt).getTime() < now.getTime()
    ? "OVERDUE"
    : "PENDING";
}

export function isOverdue(dueAt: Date | string, now: Date = zonedNow()): boolean {
  return new Date(dueAt).getTime() < now.getTime();
}

/** Completion rate in [0, 1]. Returns 0 when there is nothing planned. */
export function completionRate(completed: unknown, planned: unknown): number {
  const p = toNumber(planned);
  if (p <= 0) return 0;
  return Math.min(toNumber(completed) / p, 1);
}

/** Aggregate planned session slots for a week (5 workdays × 3 sessions). */
export function plannedSessionsPerWeek(): number {
  return WORKDAYS.length * SESSIONS_PER_WORKDAY;
}
