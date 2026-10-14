import type { ReminderStatus, ReminderType } from "@prisma/client";
import { prisma } from "./prisma";
import {
  addDays,
  addMonths,
  startOfMonth,
  startOfWeek,
  zonedDateOnly,
  zonedNow,
} from "./datetime";
import {
  buildReminderPlan,
  isWeeklyReportDue,
  planReminderResolutions,
  RECONCILABLE_REMINDER_TYPES,
  type PendingReminder,
  type ReminderFactSet,
} from "./daily-work";

/**
 * Automatic reminder engine.
 *
 * Scans recorded data and raises advisory reminders for the obligations that
 * matter, then reconciles stale ones. It is safe to run on every page load and
 * from the background cron job:
 *
 * - Generation is idempotent — a reminder is keyed by `type` + `relatedId`, and
 *   any existing reminder for that key (pending, completed or dismissed) stops
 *   regeneration, so dismissed reminders are never resurrected. The `Reminder`
 *   table also has a unique index on `(type, relatedId)` and inserts use
 *   `skipDuplicates`, so even overlapping runs cannot duplicate a reminder.
 * - Reconciliation only *completes* pending/overdue reminders whose underlying
 *   obligation has been met (sessions done, task closed, report submitted, plan
 *   created). It never reopens or resurrects anything.
 * - Reminders are advisory: completing or dismissing one never mutates the
 *   underlying session, task, plan or report.
 * - All day/week/month boundaries are computed in `Africa/Addis_Ababa`.
 */

export type GenerateRemindersResult = {
  created: number;
  completed: number;
  ranAt: string;
};

const OPEN_SESSION_STATUSES = ["PLANNED", "IN_PROGRESS"] as const;
const OPEN_TASK_STATUSES = ["TODO", "IN_PROGRESS", "BLOCKED"] as const;

/** Raise any missing reminders and resolve any that are no longer needed. */
export async function generateReminders(
  now: Date = zonedNow(),
): Promise<GenerateRemindersResult> {
  const today = zonedDateOnly(now);
  const currentWeekStart = startOfWeek(today);
  const nextWeekStart = addDays(currentWeekStart, 7);
  const monthStart = startOfMonth(today);
  const previousMonthStart = addMonths(monthStart, -1);

  const [incompleteSessions, overdueTasks, weekPlans, existing, nextWeekPlanCount, projects] =
    await Promise.all([
      prisma.workSession.findMany({
        where: {
          status: { in: [...OPEN_SESSION_STATUSES] },
          date: { lte: today },
        },
        select: { date: true, sessionNumber: true, status: true },
      }),
      prisma.task.findMany({
        where: {
          status: { in: [...OPEN_TASK_STATUSES] },
          dueDate: { lt: now },
        },
        select: { id: true, title: true, dueDate: true },
      }),
      prisma.weekPlan.findMany({
        where: { weekStart: { lte: currentWeekStart } },
        include: { report: { select: { status: true } } },
        orderBy: { weekStart: "desc" },
        take: 26,
      }),
      prisma.reminder.findMany({
        select: { type: true, relatedId: true, status: true },
      }),
      prisma.weekPlan.count({ where: { weekStart: nextWeekStart } }),
      prisma.project.findMany({
        select: {
          id: true,
          name: true,
          status: true,
          budget: true,
          agreedPrice: true,
          payments: { select: { amount: true } },
          collectionSchedule: {
            select: {
              id: true,
              label: true,
              expectedAmount: true,
              expectedDate: true,
              status: true,
              receivedAmount: true,
            },
          },
        },
      }),
    ]);

  // A week's report is due on its reporting Saturday; it stays "missing" until a
  // report is actually submitted (SUBMITTED or LATE).
  const missingReportWeeks = weekPlans
    .filter(
      (plan) =>
        isWeeklyReportDue(plan.weekStart, today) &&
        (!plan.report || plan.report.status === "DRAFT"),
    )
    .map((plan) => ({ weekPlanId: plan.id, weekStart: plan.weekStart }));

  const dayOfWeek = today.getUTCDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const drafts = buildReminderPlan({
    now,
    incompleteSessions: incompleteSessions.map((s) => ({
      date: s.date,
      sessionNumber: s.sessionNumber,
      status: s.status,
    })),
    overdueTasks: overdueTasks.map((t) => ({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate,
    })),
    needsWeeklyPlanning:
      isWeekend && nextWeekPlanCount === 0 ? { weekStart: nextWeekStart } : null,
    missingReportWeeks,
    needsMonthlyFinanceReview: { monthStart: previousMonthStart },
    needsMonthlyPerformanceReview: { monthStart: previousMonthStart },
    existing: existing.map((e) => ({
      type: e.type,
      relatedId: e.relatedId,
      status: e.status,
    })),
  });

  // Project collection reminders. These are keyed by project/schedule so the
  // same (type, relatedId) never duplicates.
  drafts.push(
    ...buildProjectCollectionReminders(
      projects.map((project) => ({
        id: project.id,
        name: project.name,
        status: project.status,
        agreedPrice: project.agreedPrice,
        budget: project.budget,
        payments: project.payments,
        collectionSchedule: project.collectionSchedule,
      })),
      now,
    ),
  );

  let created = 0;
  if (drafts.length > 0) {
    // skipDuplicates guards against two overlapping runs inserting the same
    // (type, relatedId) at once; the unique index makes it a no-op conflict.
    const result = await prisma.reminder.createMany({
      data: drafts.map((draft) => ({
        type: draft.type as ReminderType,
        title: draft.title,
        description: draft.description,
        dueAt: draft.dueAt,
        channel: "IN_APP" as const,
        relatedType: draft.relatedType,
        relatedId: draft.relatedId,
      })),
      skipDuplicates: true,
    });
    created = result.count;
  }

  const completed = await reconcileReminders(now);
  return { created, completed, ranAt: now.toISOString() };
}

/**
 * Complete pending/overdue advisory reminders whose obligation is satisfied.
 * Returns how many reminders were completed.
 */
async function reconcileReminders(now: Date): Promise<number> {
  const pending = (await prisma.reminder.findMany({
    where: {
      status: { in: ["PENDING", "OVERDUE"] as ReminderStatus[] },
      type: { in: RECONCILABLE_REMINDER_TYPES as ReminderType[] },
    },
    select: { id: true, type: true, relatedId: true },
  })) as PendingReminder[];
  if (pending.length === 0) return 0;

  const sessionDays = [
    ...new Set(
      pending
        .filter((r) => r.type === "WORK_SESSION" && r.relatedId)
        .map((r) => r.relatedId as string),
    ),
  ];
  const taskIds = [
    ...new Set(
      pending
        .filter((r) => r.type === "OVERDUE_TASK" && r.relatedId)
        .map((r) => r.relatedId as string),
    ),
  ];
  const reportPlanIds = [
    ...new Set(
      pending
        .filter((r) => r.type === "MISSING_REPORT" && r.relatedId)
        .map((r) => r.relatedId as string),
    ),
  ];
  const planStartKeys = [
    ...new Set(
      pending
        .filter((r) => r.type === "WEEKLY_PLANNING" && r.relatedId)
        .map((r) => r.relatedId as string),
    ),
  ];
  const scheduleIds = [
    ...new Set(
      pending
        .filter((r) => r.type === "PROJECT_OVERDUE" && r.relatedId)
        .map((r) => r.relatedId as string),
    ),
  ];
  const projectIds = [
    ...new Set(
      pending
        .filter((r) => r.type === "PROJECT_OUTSTANDING" && r.relatedId)
        .map((r) => r.relatedId as string),
    ),
  ];

  const sessionDates = sessionDays.map((d) => new Date(`${d}T00:00:00.000Z`));
  const planStartDates = planStartKeys
    .map((s) => new Date(s))
    .filter((d) => !Number.isNaN(d.getTime()));

  const [openSessions, openTasks, reportPlans, plannedAt, openSchedules, outstandingProjects] =
    await Promise.all([
      sessionDates.length > 0
        ? prisma.workSession.findMany({
            where: {
              status: { in: [...OPEN_SESSION_STATUSES] },
              date: { in: sessionDates },
            },
            select: { date: true },
          })
        : Promise.resolve([] as { date: Date }[]),
      taskIds.length > 0
        ? prisma.task.findMany({
            where: { id: { in: taskIds } },
            select: { id: true, status: true, dueDate: true },
          })
        : Promise.resolve([] as { id: string; status: string; dueDate: Date | null }[]),
      reportPlanIds.length > 0
        ? prisma.weekPlan.findMany({
            where: { id: { in: reportPlanIds } },
            include: { report: { select: { status: true } } },
          })
        : Promise.resolve(
            [] as { id: string; report: { status: string } | null }[],
          ),
      planStartDates.length > 0
        ? prisma.weekPlan.findMany({
            where: { weekStart: { in: planStartDates } },
            select: { weekStart: true },
          })
        : Promise.resolve([] as { weekStart: Date }[]),
      scheduleIds.length > 0
        ? prisma.collectionSchedule.findMany({
            where: { id: { in: scheduleIds } },
            select: { id: true, expectedDate: true, status: true },
          })
        : Promise.resolve([] as { id: string; expectedDate: Date; status: string }[]),
      projectIds.length > 0
        ? prisma.project.findMany({
            where: { id: { in: projectIds } },
            select: {
              id: true,
              budget: true,
              agreedPrice: true,
              payments: { select: { amount: true } },
            },
          })
        : Promise.resolve([] as { id: string; budget: unknown; agreedPrice: unknown; payments: { amount: unknown }[] }[]),
    ]);

  const facts: ReminderFactSet = {
    openSessionDays: [
      ...new Set(openSessions.map((s) => s.date.toISOString().slice(0, 10))),
    ],
    openOverdueTaskIds: openTasks
      .filter(
        (t) =>
          (t.status === "TODO" ||
            t.status === "IN_PROGRESS" ||
            t.status === "BLOCKED") &&
          t.dueDate !== null &&
          t.dueDate.getTime() < now.getTime(),
      )
      .map((t) => t.id),
    submittedWeekPlanIds: reportPlans
      .filter(
        (p) =>
          p.report !== null &&
          (p.report.status === "SUBMITTED" || p.report.status === "LATE"),
      )
      .map((p) => p.id),
    deletedWeekPlanIds: reportPlanIds.filter(
      (id) => !reportPlans.some((p) => p.id === id),
    ),
    existingPlanStarts: plannedAt.map((p) => p.weekStart.toISOString()),
    openOverdueScheduleIds: openSchedules
      .filter(
        (s) =>
          s.status !== "RECEIVED" &&
          s.status !== "CANCELLED" &&
          new Date(s.expectedDate).getTime() < now.getTime(),
      )
      .map((s) => s.id)
      .concat(scheduleIds.filter((id) => !openSchedules.some((s) => s.id === id))),
    projectsOutstandingIds: outstandingProjects
      .filter((project) => {
        const agreed = Number(project.agreedPrice ?? project.budget ?? 0);
        const collected = project.payments.reduce(
          (sum, payment) => sum + Number(payment.amount),
          0,
        );
        return Math.max(agreed - collected, 0) > 0;
      })
      .map((project) => project.id)
      .concat(projectIds.filter((id) => !outstandingProjects.some((p) => p.id === id))),
  };

  const resolvedIds = planReminderResolutions(pending, facts);
  if (resolvedIds.length === 0) return 0;

  const result = await prisma.reminder.updateMany({
    where: { id: { in: resolvedIds } },
    data: { status: "COMPLETED", completedAt: now },
  });
  return result.count;
}

// Re-export for callers that reason about which reminders auto-resolve.
export { RECONCILABLE_REMINDER_TYPES };


export type ProjectCollectionReminderInput = {
  id: string;
  name: string;
  status: string;
  agreedPrice?: unknown;
  budget?: unknown;
  payments: { amount: unknown }[];
  collectionSchedule: {
    id: string;
    label: string;
    expectedAmount: unknown;
    expectedDate: Date | string;
    status: string;
    receivedAmount?: unknown;
  }[];
};

/**
 * Pure helper: build project collection reminder drafts.
 */
export function buildProjectCollectionReminders(
  projects: ProjectCollectionReminderInput[],
  now: Date,
): {
  type: "PROJECT_OUTSTANDING" | "PROJECT_OVERDUE";
  title: string;
  description: string;
  dueAt: Date;
  relatedType: string;
  relatedId: string;
}[] {
  const drafts: {
    type: "PROJECT_OUTSTANDING" | "PROJECT_OVERDUE";
    title: string;
    description: string;
    dueAt: Date;
    relatedType: string;
    relatedId: string;
  }[] = [];
  for (const project of projects) {
    const agreedValue = Number(project.agreedPrice ?? project.budget ?? 0);
    const collected = project.payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const outstanding = Math.max(agreedValue - collected, 0);
    if (outstanding > 0) {
      drafts.push({
        type: "PROJECT_OUTSTANDING",
        title: `Outstanding balance: ${project.name}`,
        description:
          project.status === "COMPLETED"
            ? `This project is completed but ${outstanding.toFixed(2)} ETB is still owed.`
            : `${outstanding.toFixed(2)} ETB is still owed on this project.`,
        dueAt: new Date(now),
        relatedType: "Project",
        relatedId: project.id,
      });
    }
    for (const schedule of project.collectionSchedule) {
      if (schedule.status === "RECEIVED" || schedule.status === "CANCELLED") {
        continue;
      }
      const expectedDate = new Date(schedule.expectedDate);
      if (expectedDate.getTime() >= now.getTime()) continue;
      const outstandingMilestone = Math.max(
        Number(schedule.expectedAmount) - Number(schedule.receivedAmount ?? 0),
        0,
      );
      drafts.push({
        type: "PROJECT_OVERDUE",
        title: `Overdue payment: ${project.name}`,
        description: `${schedule.label} was expected ${expectedDate.toISOString().slice(0, 10)}${outstandingMilestone > 0 ? ` and ${outstandingMilestone.toFixed(2)} ETB is unpaid` : ""}.`,
        dueAt: expectedDate,
        relatedType: "CollectionSchedule",
        relatedId: schedule.id,
      });
    }
  }
  return drafts;
}
