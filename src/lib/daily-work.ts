import {
  PLANNED_HOURS_PER_DAY,
  SESSION_MINUTES,
  SESSIONS_PER_WORKDAY,
  WORKDAYS,
} from "./constants";
import {
  addDays,
  addMonths,
  getDayOfWeek,
  reportingSaturday,
  startOfWeek,
  zonedDateOnly,
  zonedNow,
} from "./datetime";
import { toNumber } from "./utils";

/**
 * Pure daily-work, task, planning and performance rules for AddisDR ERP.
 * No I/O: every function takes plain data so it can be unit tested.
 */

export type WorkSessionStatusValue =
  | "PLANNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "MISSED"
  | "RESCHEDULED";

export type TaskStatusValue =
  | "TODO"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "DONE"
  | "CANCELLED";

export type TaskPriorityValue = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type WeekPlanStatusValue = "DRAFT" | "ACTIVE" | "SUBMITTED" | "ARCHIVED";

export type WeeklyReportStatusValue = "DRAFT" | "SUBMITTED" | "LATE";

export const SESSION_STATUSES: WorkSessionStatusValue[] = [
  "PLANNED",
  "IN_PROGRESS",
  "COMPLETED",
  "MISSED",
  "RESCHEDULED",
];

export const TASK_STATUSES: TaskStatusValue[] = [
  "TODO",
  "IN_PROGRESS",
  "BLOCKED",
  "DONE",
  "CANCELLED",
];

export const TASK_PRIORITIES: TaskPriorityValue[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
];

export const WEEK_PLAN_STATUSES: WeekPlanStatusValue[] = [
  "DRAFT",
  "ACTIVE",
  "SUBMITTED",
  "ARCHIVED",
];

export const WEEKLY_REPORT_STATUSES: WeeklyReportStatusValue[] = [
  "DRAFT",
  "SUBMITTED",
  "LATE",
];

export type SessionLike = {
  date: Date | string;
  sessionNumber: number;
  plannedMinutes?: unknown;
  actualMinutes?: unknown;
  status: WorkSessionStatusValue;
  focus?: string | null;
  location?: string | null;
};

export type TaskLike = {
  id?: string;
  title?: string;
  status: TaskStatusValue;
  priority: TaskPriorityValue;
  isRequired?: boolean;
  dueDate?: Date | string | null;
  completedAt?: Date | string | null;
  weekPlanId?: string | null;
};

const PRIORITY_RANK: Record<TaskPriorityValue, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

/** Lower rank sorts first (URGENT → LOW). */
export function taskPriorityRank(priority: TaskPriorityValue): number {
  return PRIORITY_RANK[priority] ?? 99;
}

export function isWorkdayDate(date: Date | string): boolean {
  return (WORKDAYS as readonly number[]).includes(getDayOfWeek(zonedDateOnly(date)));
}

export function sessionPlannedMinutes(session: {
  plannedMinutes?: unknown;
}): number {
  const minutes = toNumber(session.plannedMinutes);
  return minutes > 0 ? minutes : SESSION_MINUTES;
}

export function hoursFromMinutes(minutes: unknown): number {
  return toNumber(minutes) / 60;
}

/**
 * Actual minutes worked for a session. Uses the recorded value when present;
 * a completed session without a recorded value counts its planned minutes.
 */
export function effectiveActualMinutes(session: SessionLike): number {
  const actual = toNumber(session.actualMinutes);
  if (actual > 0) return actual;
  if (session.status === "COMPLETED") return sessionPlannedMinutes(session);
  return 0;
}

export function isCompletedSession(session: SessionLike): boolean {
  return session.status === "COMPLETED";
}

export function isOpenSession(session: SessionLike): boolean {
  return session.status === "PLANNED" || session.status === "IN_PROGRESS";
}

export type SessionSummary = {
  planned: number;
  completed: number;
  missed: number;
  rescheduled: number;
  inProgress: number;
  pending: number;
  plannedMinutes: number;
  actualMinutes: number;
  plannedHours: number;
  actualHours: number;
  completionRate: number;
  remaining: number;
};

/** Aggregate session metrics over any window. */
export function summarizeSessions(sessions: SessionLike[]): SessionSummary {
  let completed = 0;
  let missed = 0;
  let rescheduled = 0;
  let inProgress = 0;
  let pending = 0;
  let plannedMinutes = 0;
  let actualMinutes = 0;

  for (const session of sessions) {
    plannedMinutes += sessionPlannedMinutes(session);
    actualMinutes += effectiveActualMinutes(session);
    switch (session.status) {
      case "COMPLETED":
        completed += 1;
        break;
      case "MISSED":
        missed += 1;
        break;
      case "RESCHEDULED":
        rescheduled += 1;
        break;
      case "IN_PROGRESS":
        inProgress += 1;
        break;
      default:
        pending += 1;
    }
  }

  const planned = sessions.length;
  const completionRate = planned > 0 ? Math.min(completed / planned, 1) : 0;

  return {
    planned,
    completed,
    missed,
    rescheduled,
    inProgress,
    pending,
    plannedMinutes,
    actualMinutes,
    plannedHours: hoursFromMinutes(plannedMinutes),
    actualHours: hoursFromMinutes(actualMinutes),
    completionRate,
    remaining: Math.max(planned - completed, 0),
  };
}

export type DayProgress = {
  total: number;
  completed: number;
  remaining: number;
  plannedHours: number;
  actualHours: number;
  rate: number;
  isComplete: boolean;
  hasAny: boolean;
};

/** Progress for a single day's session slots (normally three). */
export function dayProgress(sessions: SessionLike[]): DayProgress {
  const summary = summarizeSessions(sessions);
  return {
    total: summary.planned,
    completed: summary.completed,
    remaining: summary.remaining,
    plannedHours: summary.plannedHours,
    actualHours: summary.actualHours,
    rate: summary.completionRate,
    isComplete: summary.planned > 0 && summary.completed === summary.planned,
    hasAny: summary.planned > 0,
  };
}

export type SessionsByDay = {
  date: Date;
  sessions: SessionLike[];
};

/** Group sessions by their UTC-normalized day, oldest first. */
export function groupSessionsByDay(sessions: SessionLike[]): SessionsByDay[] {
  const map = new Map<string, SessionLike[]>();
  for (const session of sessions) {
    const key = zonedDateOnly(session.date).toISOString();
    const list = map.get(key);
    if (list) list.push(session);
    else map.set(key, [session]);
  }
  return [...map.entries()]
    .map(([key, list]) => ({
      date: new Date(key),
      sessions: list.sort((a, b) => a.sessionNumber - b.sessionNumber),
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export function isOpenTaskStatus(status: TaskStatusValue): boolean {
  return status === "TODO" || status === "IN_PROGRESS" || status === "BLOCKED";
}

export function isTaskOverdue(task: TaskLike, now: Date = zonedNow()): boolean {
  if (!isOpenTaskStatus(task.status) || !task.dueDate) return false;
  return new Date(task.dueDate).getTime() < now.getTime();
}

export type TaskSummary = {
  total: number;
  open: number;
  done: number;
  blocked: number;
  cancelled: number;
  overdue: number;
  requiredOpen: number;
  completionRate: number;
};

/** Task metrics for any set of tasks. */
export function summarizeTasks(tasks: TaskLike[], now: Date = zonedNow()): TaskSummary {
  let open = 0;
  let done = 0;
  let blocked = 0;
  let cancelled = 0;
  let overdue = 0;
  let requiredOpen = 0;

  for (const task of tasks) {
    if (task.status === "DONE") done += 1;
    else if (task.status === "CANCELLED") cancelled += 1;
    else {
      open += 1;
      if (task.status === "BLOCKED") blocked += 1;
      if (task.isRequired) requiredOpen += 1;
      if (isTaskOverdue(task, now)) overdue += 1;
    }
  }

  const total = tasks.length;
  const completionRate = total > 0 ? Math.min(done / total, 1) : 0;

  return { total, open, done, blocked, cancelled, overdue, requiredOpen, completionRate };
}

/**
 * Unfinished tasks eligible to carry forward to the next week, most urgent
 * first. Required and overdue tasks always surface above optional work.
 */
export function carryForwardCandidates<T extends TaskLike>(
  tasks: T[],
  now: Date = zonedNow(),
): T[] {
  return tasks
    .filter((task) => isOpenTaskStatus(task.status))
    .sort((a, b) => {
      if (a.isRequired !== b.isRequired) return a.isRequired ? -1 : 1;
      const aOver = isTaskOverdue(a, now) ? 0 : 1;
      const bOver = isTaskOverdue(b, now) ? 0 : 1;
      if (aOver !== bOver) return aOver - bOver;
      return taskPriorityRank(a.priority) - taskPriorityRank(b.priority);
    });
}

// ---------------------------------------------------------------------------
// Performance
// ---------------------------------------------------------------------------

export type PerformanceMetrics = {
  plannedSessions: number;
  completedSessions: number;
  missedSessions: number;
  rescheduledSessions: number;
  plannedHours: number;
  completedHours: number;
  sessionCompletionRate: number;
  tasksTotal: number;
  tasksDone: number;
  tasksOpen: number;
  tasksOverdue: number;
  taskCompletionRate: number;
};

/** Combined session + task performance for a period's recorded data. */
export function performanceMetrics(
  sessions: SessionLike[],
  tasks: TaskLike[],
  now: Date = zonedNow(),
): PerformanceMetrics {
  const s = summarizeSessions(sessions);
  const t = summarizeTasks(tasks, now);
  return {
    plannedSessions: s.planned,
    completedSessions: s.completed,
    missedSessions: s.missed,
    rescheduledSessions: s.rescheduled,
    plannedHours: s.plannedHours,
    completedHours: s.actualHours,
    sessionCompletionRate: s.completionRate,
    tasksTotal: t.total,
    tasksDone: t.done,
    tasksOpen: t.open,
    tasksOverdue: t.overdue,
    taskCompletionRate: t.completionRate,
  };
}

export type TrendDirection = "up" | "down" | "flat";

export type Comparison = {
  current: number;
  previous: number;
  delta: number;
  deltaPct: number;
  direction: TrendDirection;
};

/** Compare two periods. `deltaPct` is 0 when the previous value is 0. */
export function periodComparison(current: unknown, previous: unknown): Comparison {
  const c = toNumber(current);
  const p = toNumber(previous);
  const delta = c - p;
  const direction: TrendDirection = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  return {
    current: c,
    previous: p,
    delta,
    deltaPct: p !== 0 ? delta / Math.abs(p) : 0,
    direction,
  };
}

export type SessionSeriesPoint = {
  date: Date;
  planned: number;
  completed: number;
  actualHours: number;
};

/** Per-day series over a range (used for daily/weekly trend views). */
export function dailySeries(
  sessions: SessionLike[],
  range: { from: Date; to: Date },
): SessionSeriesPoint[] {
  const groups = groupSessionsByDay(sessions);
  const result: SessionSeriesPoint[] = [];
  for (let d = zonedDateOnly(range.from); d.getTime() < range.to.getTime(); d = addDays(d, 1)) {
    const daySessions = groups.find((g) => g.date.getTime() === d.getTime())?.sessions ?? [];
    const summary = summarizeSessions(daySessions);
    result.push({
      date: d,
      planned: summary.planned,
      completed: summary.completed,
      actualHours: summary.actualHours,
    });
  }
  return result;
}

/**
 * Planned session slots for a full work week (five workdays × three sessions).
 * Days the user marked as leave simply have no recorded sessions.
 */
export function plannedSessionsForWeek(): number {
  return WORKDAYS.length * SESSIONS_PER_WORKDAY;
}

export function plannedHoursForWeek(): number {
  return PLANNED_HOURS_PER_DAY * WORKDAYS.length;
}

/**
 * The next calendar week's Monday relative to `date` when the user is on the
 * weekend planning cadence. Returns the Monday following the current week.
 */
export function nextWeekStart(date: Date): Date {
  return addDays(startOfWeek(date), 7);
}

// ---------------------------------------------------------------------------
// Weekly report prompts (exact reporting format)
// ---------------------------------------------------------------------------

export const REPORT_SECTIONS = [
  { key: "summary", heading: "Done this week" },
  { key: "numbers", heading: "Numbers" },
  { key: "challenges", heading: "What didn't work / mistakes" },
  { key: "highlights", heading: "Key takeaways" },
  { key: "nextWeekGoals", heading: "Next week's goals" },
  { key: "needHelpWith", heading: "Need help with" },
] as const;

export type ReportSectionKey = (typeof REPORT_SECTIONS)[number]["key"];

export type WeeklyReportContent = Record<Exclude<ReportSectionKey, "numbers">, string>;

export const EMPTY_REPORT_CONTENT: WeeklyReportContent = {
  summary: "",
  challenges: "",
  highlights: "",
  nextWeekGoals: "",
  needHelpWith: "",
};

export type ReportMetrics = {
  commercial: {
    leadsCreated: number;
    dealsWon: number;
    wonValue: number;
  };
  finance: {
    receivedIncome: number;
    businessExpenses: number;
    netProfit: number;
  };
  dailyWork: {
    plannedSessions: number;
    completedSessions: number;
    completedHours: number;
    sessionCompletionRate: number;
  };
  tasks: {
    total: number;
    done: number;
    completionRate: number;
  };
};

/**
 * Render the auto-populated "Numbers" section as plain lines. Missing data
 * simply yields zeroes — nothing is fabricated.
 */
export function renderNumbersSection(metrics: ReportMetrics): string {
  const { commercial, finance, dailyWork, tasks } = metrics;
  return [
    `Leads created: ${commercial.leadsCreated}`,
    `Deals won: ${commercial.dealsWon} (${commercial.wonValue.toFixed(2)} ETB)`,
    `Income received: ${finance.receivedIncome.toFixed(2)} ETB`,
    `Business expenses: ${finance.businessExpenses.toFixed(2)} ETB`,
    `Net profit: ${finance.netProfit.toFixed(2)} ETB`,
    `Sessions completed: ${dailyWork.completedSessions}/${dailyWork.plannedSessions} (${Math.round(
      dailyWork.sessionCompletionRate * 100,
    )}%)`,
    `Hours completed: ${dailyWork.completedHours.toFixed(1)}`,
    `Tasks completed: ${tasks.done}/${tasks.total} (${Math.round(
      tasks.completionRate * 100,
    )}%)`,
  ].join("\n");
}

/** Full report rendered with the exact section order. */
export function renderWeeklyReport(
  content: WeeklyReportContent,
  metrics: ReportMetrics,
): string {
  const byKey: Record<ReportSectionKey, string> = {
    summary: content.summary,
    numbers: renderNumbersSection(metrics),
    challenges: content.challenges,
    highlights: content.highlights,
    nextWeekGoals: content.nextWeekGoals,
    needHelpWith: content.needHelpWith,
  };
  return REPORT_SECTIONS.map(
    (section) => `## ${section.heading}\n${byKey[section.key].trim() || "—"}`,
  ).join("\n\n");
}

// ---------------------------------------------------------------------------
// Reminder planning
// ---------------------------------------------------------------------------

export type ReminderTypeValue =
  | "WORK_SESSION"
  | "TASK_REVIEW"
  | "SALES_FOLLOWUP"
  | "MEETING"
  | "WEEKLY_PLANNING"
  | "WEEKLY_REPORT"
  | "MISSING_REPORT"
  | "MONTHLY_PERFORMANCE"
  | "MONTHLY_FINANCE"
  | "SPENDING_LIMIT"
  | "DEADLINE"
  | "OVERDUE_TASK"
  | "PROJECT_OUTSTANDING"
  | "PROJECT_OVERDUE"
  | "CUSTOM";

export type ReminderDraft = {
  type: ReminderTypeValue;
  title: string;
  description: string;
  dueAt: Date;
  relatedType: string;
  relatedId: string;
};

export type ReminderPlanInput = {
  now: Date;
  incompleteSessions: { date: Date | string; sessionNumber: number; status: WorkSessionStatusValue }[];
  overdueTasks: { id: string; title: string; dueDate: Date | string | null }[];
  needsWeeklyPlanning: { weekStart: Date } | null;
  missingReportWeeks: { weekPlanId: string; weekStart: Date }[];
  /** When set, a monthly finance review reminder is due for this month. */
  needsMonthlyFinanceReview?: { monthStart: Date } | null;
  /** When set, a monthly performance review reminder is due for this month. */
  needsMonthlyPerformanceReview?: { monthStart: Date } | null;
  existing: { type: string; relatedId: string | null; status: string }[];
};

/** Stable `YYYY-MM` key for a month (UTC). */
export function monthKey(monthStart: Date): string {
  return `${monthStart.getUTCFullYear()}-${String(
    monthStart.getUTCMonth() + 1,
  ).padStart(2, "0")}`;
}

/**
 * A week's accountability report becomes due on its reporting Saturday and
 * stays due until a report is submitted. Returns true once `today` has reached
 * that Saturday (inclusive), so the current week's report is raised on its due
 * day rather than only the following week.
 */
export function isWeeklyReportDue(weekStart: Date, today: Date): boolean {
  return reportingSaturday(weekStart).getTime() <= zonedDateOnly(today).getTime();
}

/**
 * Build the set of reminders that should exist for recorded data. Existing
 * pending reminders (matched by type + relatedId) are skipped so the action is
 * idempotent. Reminders are advisory only — dismissing one never completes the
 * underlying session, task or report.
 */
export function buildReminderPlan(input: ReminderPlanInput): ReminderDraft[] {
  const { now, existing } = input;
  const drafts: ReminderDraft[] = [];

  // Any existing reminder for the same type + record (including completed or
  // dismissed ones) suppresses regeneration, so dismissing is respected and
  // reminders are never resurrected.
  const existingKeys = new Set(
    existing.map((e) => `${e.type}:${e.relatedId ?? ""}`),
  );
  const seen = new Set<string>();
  const push = (draft: ReminderDraft) => {
    const key = `${draft.type}:${draft.relatedId}`;
    if (seen.has(key) || existingKeys.has(key)) return;
    seen.add(key);
    drafts.push(draft);
  };

  // Incomplete work sessions: group by day.
  const incompleteByDay = new Map<string, number>();
  for (const session of input.incompleteSessions) {
    if (session.status !== "PLANNED" && session.status !== "IN_PROGRESS") continue;
    const day = zonedDateOnly(session.date).toISOString().slice(0, 10);
    incompleteByDay.set(day, (incompleteByDay.get(day) ?? 0) + 1);
  }
  for (const [day, count] of incompleteByDay) {
    push({
      type: "WORK_SESSION",
      title: `Complete ${count} work session${count === 1 ? "" : "s"}`,
      description: "Recorded sessions are still open for the day. Tick each session when done.",
      dueAt: new Date(`${day}T18:00:00.000Z`),
      relatedType: "WorkSessionDay",
      relatedId: day,
    });
  }

  // Overdue tasks.
  for (const task of input.overdueTasks) {
    push({
      type: "OVERDUE_TASK",
      title: `Overdue task: ${task.title}`,
      description: "This task passed its due date. Reschedule it or complete it.",
      dueAt: task.dueDate ? new Date(task.dueDate) : now,
      relatedType: "Task",
      relatedId: task.id,
    });
  }

  // Saturday weekly planning.
  if (input.needsWeeklyPlanning) {
    const weekStart = input.needsWeeklyPlanning.weekStart;
    push({
      type: "WEEKLY_PLANNING",
      title: "Plan next week",
      description:
        "Saturday planning: set sessions, work locations, tasks and commercial targets for next week.",
      dueAt: addDays(weekStart, -2), // Saturday before Monday
      relatedType: "WeekPlan",
      relatedId: weekStart.toISOString(),
    });
  }

  // Missing weekly reports for completed weeks.
  for (const week of input.missingReportWeeks) {
    push({
      type: "MISSING_REPORT",
      title: `Weekly report missing (week of ${week.weekStart.toISOString().slice(0, 10)})`,
      description: "Submit the accountability report for this week.",
      dueAt: addDays(week.weekStart, 5), // Saturday
      relatedType: "WeekPlan",
      relatedId: week.weekPlanId,
    });
  }

  // Monthly finance review of the just-completed month.
  if (input.needsMonthlyFinanceReview) {
    const monthStart = input.needsMonthlyFinanceReview.monthStart;
    const key = monthKey(monthStart);
    push({
      type: "MONTHLY_FINANCE",
      title: `Monthly finance review (${key})`,
      description:
        "Review last month's income, expenses, net profit, allocations and personal allowance.",
      dueAt: addMonths(monthStart, 1), // first day of the following month
      relatedType: "Month",
      relatedId: key,
    });
  }

  // Monthly performance review of the just-completed month.
  if (input.needsMonthlyPerformanceReview) {
    const monthStart = input.needsMonthlyPerformanceReview.monthStart;
    const key = monthKey(monthStart);
    push({
      type: "MONTHLY_PERFORMANCE",
      title: `Monthly performance review (${key})`,
      description:
        "Review last month's sessions, task discipline, commercial results and trends.",
      dueAt: addMonths(monthStart, 1), // first day of the following month
      relatedType: "Month",
      relatedId: key,
    });
  }

  return drafts;
}

/** Reminder types whose obligations are resolved automatically by the engine. */
export const RECONCILABLE_REMINDER_TYPES: ReminderTypeValue[] = [
  "WORK_SESSION",
  "OVERDUE_TASK",
  "MISSING_REPORT",
  "WEEKLY_PLANNING",
  "PROJECT_OVERDUE",
  "PROJECT_OUTSTANDING",
];

export type PendingReminder = {
  id: string;
  type: string;
  relatedId: string | null;
};

/**
 * Current facts, gathered by the engine, that decide whether a pending reminder
 * is still outstanding.
 */
export type ReminderFactSet = {
  /** `YYYY-MM-DD` days that still have at least one open session. */
  openSessionDays: string[];
  /** Task ids that are still open *and* overdue. */
  openOverdueTaskIds: string[];
  /** WeekPlan ids whose report is SUBMITTED or LATE. */
  submittedWeekPlanIds: string[];
  /** WeekPlan ids referenced by a reminder but no longer present. */
  deletedWeekPlanIds: string[];
  /** ISO week-start strings that now have a plan. */
  existingPlanStarts: string[];
  /** Collection schedule ids that are still open and overdue. */
  openOverdueScheduleIds?: string[];
  /** Project ids that still have an outstanding collection balance. */
  projectsOutstandingIds?: string[];
};

/**
 * Pure reconciliation: return the ids of pending reminders whose underlying
 * obligation has been met, so the engine can mark them completed. Reminders
 * without a related record, or whose obligation is still outstanding, are left
 * untouched — and this never reopens, recreates or dismisses anything.
 */
export function planReminderResolutions(
  pending: PendingReminder[],
  facts: ReminderFactSet,
): string[] {
  const openDays = new Set(facts.openSessionDays);
  const openTasks = new Set(facts.openOverdueTaskIds);
  const submitted = new Set(facts.submittedWeekPlanIds);
  const deleted = new Set(facts.deletedWeekPlanIds);
  const planned = new Set(facts.existingPlanStarts);
  const openSchedules = new Set(facts.openOverdueScheduleIds ?? []);
  const outstandingProjects = new Set(facts.projectsOutstandingIds ?? []);

  const resolved: string[] = [];
  for (const reminder of pending) {
    const relatedId = reminder.relatedId;
    if (!relatedId) continue;

    let done = false;
    switch (reminder.type) {
      case "WORK_SESSION":
        done = !openDays.has(relatedId);
        break;
      case "OVERDUE_TASK":
        done = !openTasks.has(relatedId);
        break;
      case "MISSING_REPORT":
        done = submitted.has(relatedId) || deleted.has(relatedId);
        break;
      case "WEEKLY_PLANNING":
        done = planned.has(relatedId);
        break;
      case "PROJECT_OVERDUE":
        done = !openSchedules.has(relatedId);
        break;
      case "PROJECT_OUTSTANDING":
        done = !outstandingProjects.has(relatedId);
        break;
      default:
        done = false;
    }

    if (done) resolved.push(reminder.id);
  }
  return resolved;
}
