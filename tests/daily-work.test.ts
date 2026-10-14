import { describe, it, expect } from "vitest";
import {
  buildReminderPlan,
  carryForwardCandidates,
  dayProgress,
  effectiveActualMinutes,
  groupSessionsByDay,
  isTaskOverdue,
  isWeeklyReportDue,
  isWorkdayDate,
  nextWeekStart,
  performanceMetrics,
  periodComparison,
  renderNumbersSection,
  renderWeeklyReport,
  sessionPlannedMinutes,
  summarizeSessions,
  summarizeTasks,
  type ReminderPlanInput,
  type SessionLike,
  type TaskLike,
} from "@/lib/daily-work";

const MONDAY = new Date("2026-10-12T00:00:00.000Z");
const TUESDAY = new Date("2026-10-13T00:00:00.000Z");
const SATURDAY = new Date("2026-10-17T00:00:00.000Z");
const SUNDAY = new Date("2026-10-18T00:00:00.000Z");
const NOW = new Date("2026-10-15T12:00:00.000Z");

function session(overrides: Partial<SessionLike>): SessionLike {
  return {
    date: MONDAY,
    sessionNumber: 1,
    plannedMinutes: 180,
    actualMinutes: null,
    status: "PLANNED",
    ...overrides,
  };
}

function task(overrides: Partial<TaskLike>): TaskLike {
  return {
    id: "t1",
    title: "Task",
    status: "TODO",
    priority: "MEDIUM",
    isRequired: false,
    dueDate: null,
    completedAt: null,
    ...overrides,
  };
}

describe("session tracking", () => {
  it("counts each session status and completion rate", () => {
    const summary = summarizeSessions([
      session({ status: "COMPLETED" }),
      session({ status: "MISSED" }),
      session({ status: "RESCHEDULED" }),
      session({ status: "IN_PROGRESS" }),
      session({ status: "PLANNED" }),
    ]);
    expect(summary.planned).toBe(5);
    expect(summary.completed).toBe(1);
    expect(summary.missed).toBe(1);
    expect(summary.rescheduled).toBe(1);
    expect(summary.inProgress).toBe(1);
    expect(summary.pending).toBe(1);
    expect(summary.completionRate).toBeCloseTo(0.2);
    expect(summary.remaining).toBe(4);
  });

  it("credits planned minutes to a completed session without a recorded value", () => {
    const completed = session({ status: "COMPLETED", actualMinutes: null });
    expect(effectiveActualMinutes(completed)).toBe(180);
    const recorded = session({ status: "COMPLETED", actualMinutes: 120 });
    expect(effectiveActualMinutes(recorded)).toBe(120);
    const missed = session({ status: "MISSED" });
    expect(effectiveActualMinutes(missed)).toBe(0);
  });

  it("falls back to the standard session length when none is stored", () => {
    expect(sessionPlannedMinutes({ plannedMinutes: null })).toBe(180);
    expect(sessionPlannedMinutes({ plannedMinutes: 240 })).toBe(240);
  });

  it("reports a 3-of-3 day as complete and 9 planned hours", () => {
    const progress = dayProgress([
      session({ sessionNumber: 1, status: "COMPLETED" }),
      session({ sessionNumber: 2, status: "COMPLETED" }),
      session({ sessionNumber: 3, status: "COMPLETED" }),
    ]);
    expect(progress.total).toBe(3);
    expect(progress.completed).toBe(3);
    expect(progress.isComplete).toBe(true);
    expect(progress.plannedHours).toBe(9);
    expect(progress.actualHours).toBe(9);
  });

  it("groups sessions by day, oldest first, ordered by slot", () => {
    const groups = groupSessionsByDay([
      session({ date: TUESDAY, sessionNumber: 2 }),
      session({ date: MONDAY, sessionNumber: 3 }),
      session({ date: MONDAY, sessionNumber: 1 }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].date.toISOString()).toBe(MONDAY.toISOString());
    expect(groups[0].sessions.map((s) => s.sessionNumber)).toEqual([1, 3]);
    expect(groups[1].date.toISOString()).toBe(TUESDAY.toISOString());
  });

  it("treats Monday–Friday as workdays and the weekend as rest", () => {
    expect(isWorkdayDate(MONDAY)).toBe(true);
    expect(isWorkdayDate(SATURDAY)).toBe(false);
    expect(isWorkdayDate(SUNDAY)).toBe(false);
  });

  it("targets the following Monday for next week's plan", () => {
    expect(nextWeekStart(MONDAY).toISOString()).toBe(
      new Date("2026-10-19T00:00:00.000Z").toISOString(),
    );
    expect(nextWeekStart(SATURDAY).toISOString()).toBe(
      new Date("2026-10-19T00:00:00.000Z").toISOString(),
    );
  });
});

describe("task discipline and carry-forward", () => {
  it("flags open tasks past their due date as overdue", () => {
    expect(isTaskOverdue(task({ dueDate: new Date("2026-10-10T00:00:00Z") }), NOW)).toBe(true);
    expect(isTaskOverdue(task({ status: "DONE", dueDate: new Date("2026-10-10T00:00:00Z") }), NOW)).toBe(false);
    expect(isTaskOverdue(task({ dueDate: null }), NOW)).toBe(false);
  });

  it("summarizes open, done, blocked, required and overdue counts", () => {
    const summary = summarizeTasks(
      [
        task({ status: "DONE" }),
        task({ status: "BLOCKED", isRequired: true }),
        task({ status: "TODO", dueDate: new Date("2026-10-01T00:00:00Z") }),
        task({ status: "CANCELLED" }),
      ],
      NOW,
    );
    expect(summary.total).toBe(4);
    expect(summary.done).toBe(1);
    expect(summary.open).toBe(2);
    expect(summary.blocked).toBe(1);
    expect(summary.cancelled).toBe(1);
    expect(summary.requiredOpen).toBe(1);
    expect(summary.overdue).toBe(1);
    expect(summary.completionRate).toBeCloseTo(0.25);
  });

  it("carries forward unfinished work, required and overdue first", () => {
    const candidates = carryForwardCandidates(
      [
        task({ id: "low", priority: "LOW" }),
        task({ id: "required", isRequired: true, priority: "LOW" }),
        task({ id: "overdue", dueDate: new Date("2026-10-01T00:00:00Z"), priority: "LOW" }),
        task({ id: "done", status: "DONE" }),
        task({ id: "urgent", priority: "URGENT" }),
      ],
      NOW,
    );
    expect(candidates.map((t) => t.id)).toEqual([
      "required",
      "overdue",
      "urgent",
      "low",
    ]);
  });
});

describe("performance trends", () => {
  it("compares periods and reports direction and percent change", () => {
    expect(periodComparison(3, 1)).toMatchObject({ delta: 2, direction: "up" });
    expect(periodComparison(1, 3)).toMatchObject({ delta: -2, direction: "down" });
    expect(periodComparison(2, 2)).toMatchObject({ delta: 0, direction: "flat" });
    expect(periodComparison(5, 0).deltaPct).toBe(0);
    expect(periodComparison(3, 2).deltaPct).toBeCloseTo(0.5);
  });

  it("combines session and task metrics for a period", () => {
    const metrics = performanceMetrics(
      [
        session({ status: "COMPLETED" }),
        session({ status: "COMPLETED" }),
        session({ status: "MISSED" }),
      ],
      [task({ status: "DONE" }), task({ status: "TODO" })],
      NOW,
    );
    expect(metrics.plannedSessions).toBe(3);
    expect(metrics.completedSessions).toBe(2);
    expect(metrics.missedSessions).toBe(1);
    expect(metrics.completedHours).toBe(6);
    expect(metrics.sessionCompletionRate).toBeCloseTo(2 / 3);
    expect(metrics.tasksDone).toBe(1);
    expect(metrics.tasksTotal).toBe(2);
  });
});

describe("reminder planning", () => {
  const base: ReminderPlanInput = {
    now: NOW,
    incompleteSessions: [],
    overdueTasks: [],
    needsWeeklyPlanning: null,
    missingReportWeeks: [],
    existing: [],
  };

  it("groups open sessions per day into a single reminder", () => {
    const drafts = buildReminderPlan({
      ...base,
      incompleteSessions: [
        { date: MONDAY, sessionNumber: 1, status: "PLANNED" },
        { date: MONDAY, sessionNumber: 2, status: "IN_PROGRESS" },
        { date: TUESDAY, sessionNumber: 1, status: "COMPLETED" },
      ],
    });
    expect(drafts).toHaveLength(1);
    expect(drafts[0].type).toBe("WORK_SESSION");
    expect(drafts[0].title).toContain("2 work sessions");
    expect(drafts[0].relatedId).toBe("2026-10-12");
  });

  it("never resurrects a dismissed reminder and does not complete work", () => {
    const drafts = buildReminderPlan({
      ...base,
      overdueTasks: [{ id: "t1", title: "Call lead", dueDate: "2026-10-01T00:00:00Z" }],
      existing: [{ type: "OVERDUE_TASK", relatedId: "t1", status: "DISMISSED" }],
    });
    expect(drafts).toHaveLength(0);
  });

  it("plans Saturday planning and missing weekly reports", () => {
    const drafts = buildReminderPlan({
      ...base,
      needsWeeklyPlanning: { weekStart: new Date("2026-10-19T00:00:00Z") },
      missingReportWeeks: [
        { weekPlanId: "w1", weekStart: new Date("2026-10-05T00:00:00Z") },
      ],
    });
    expect(drafts.map((d) => d.type)).toEqual(["WEEKLY_PLANNING", "MISSING_REPORT"]);
    expect(drafts[0].dueAt.toISOString().slice(0, 10)).toBe("2026-10-17");
    expect(drafts[1].relatedId).toBe("w1");
  });

  it("produces stable keys so duplicates are not created", () => {
    const input: ReminderPlanInput = {
      ...base,
      overdueTasks: [{ id: "t1", title: "Call lead", dueDate: "2026-10-01T00:00:00Z" }],
    };
    const first = buildReminderPlan(input);
    const second = buildReminderPlan({
      ...input,
      existing: first.map((d) => ({ type: d.type, relatedId: d.relatedId, status: "PENDING" })),
    });
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(0);
  });

  it("raises a monthly finance review for the completed month", () => {
    const drafts = buildReminderPlan({
      ...base,
      needsMonthlyFinanceReview: { monthStart: new Date("2026-09-01T00:00:00.000Z") },
    });
    expect(drafts).toHaveLength(1);
    expect(drafts[0].type).toBe("MONTHLY_FINANCE");
    expect(drafts[0].relatedId).toBe("2026-09");
    expect(drafts[0].dueAt.toISOString().slice(0, 10)).toBe("2026-10-01");
  });

  it("does not duplicate a dismissed monthly finance review", () => {
    const drafts = buildReminderPlan({
      ...base,
      needsMonthlyFinanceReview: { monthStart: new Date("2026-09-01T00:00:00.000Z") },
      existing: [{ type: "MONTHLY_FINANCE", relatedId: "2026-09", status: "DISMISSED" }],
    });
    expect(drafts).toHaveLength(0);
  });

  it("raises a monthly performance review for the completed month", () => {
    const drafts = buildReminderPlan({
      ...base,
      needsMonthlyPerformanceReview: { monthStart: new Date("2026-09-01T00:00:00.000Z") },
    });
    expect(drafts).toHaveLength(1);
    expect(drafts[0].type).toBe("MONTHLY_PERFORMANCE");
    expect(drafts[0].relatedId).toBe("2026-09");
    expect(drafts[0].dueAt.toISOString().slice(0, 10)).toBe("2026-10-01");
  });

  it("keeps finance and performance reviews distinct in the same month", () => {
    const drafts = buildReminderPlan({
      ...base,
      needsMonthlyFinanceReview: { monthStart: new Date("2026-09-01T00:00:00.000Z") },
      needsMonthlyPerformanceReview: { monthStart: new Date("2026-09-01T00:00:00.000Z") },
    });
    const types = drafts.map((d) => d.type).sort();
    expect(types).toEqual(["MONTHLY_FINANCE", "MONTHLY_PERFORMANCE"]);
    expect(drafts.every((d) => d.relatedId === "2026-09")).toBe(true);
  });

  it("suppresses a monthly performance review already completed", () => {
    const drafts = buildReminderPlan({
      ...base,
      needsMonthlyPerformanceReview: { monthStart: new Date("2026-09-01T00:00:00.000Z") },
      existing: [
        { type: "MONTHLY_PERFORMANCE", relatedId: "2026-09", status: "COMPLETED" },
      ],
    });
    expect(drafts).toHaveLength(0);
  });

  it("suppresses reminders for every existing status (idempotency)", () => {
    for (const status of ["PENDING", "COMPLETED", "OVERDUE", "DISMISSED"]) {
      const drafts = buildReminderPlan({
        ...base,
        overdueTasks: [{ id: "t1", title: "Call lead", dueDate: "2026-10-01T00:00:00Z" }],
        existing: [{ type: "OVERDUE_TASK", relatedId: "t1", status }],
      });
      expect(drafts).toHaveLength(0);
    }
  });
});

describe("weekly report due timing", () => {
  // Week of Monday 2026-10-12 is reported on Saturday 2026-10-17.
  it("is not due before the reporting Saturday", () => {
    expect(isWeeklyReportDue(MONDAY, new Date("2026-10-16T00:00:00.000Z"))).toBe(false);
  });

  it("is due on the reporting Saturday and stays due afterwards", () => {
    expect(isWeeklyReportDue(MONDAY, new Date("2026-10-17T00:00:00.000Z"))).toBe(true);
    expect(isWeeklyReportDue(MONDAY, new Date("2026-10-20T00:00:00.000Z"))).toBe(true);
  });

  it("normalizes the time-of-day when judging due", () => {
    expect(isWeeklyReportDue(MONDAY, new Date("2026-10-17T21:30:00.000Z"))).toBe(true);
  });
});

describe("weekly report rendering", () => {
  const metrics = {
    commercial: { leadsCreated: 4, dealsWon: 2, wonValue: 15000 },
    finance: { receivedIncome: 20000, businessExpenses: 5000, netProfit: 15000 },
    dailyWork: {
      plannedSessions: 15,
      completedSessions: 12,
      completedHours: 36,
      sessionCompletionRate: 0.8,
    },
    tasks: { total: 10, done: 8, completionRate: 0.8 },
  };

  it("renders the exact reporting sections in order", () => {
    const output = renderWeeklyReport(
      {
        summary: "Shipped the dashboard",
        challenges: "Underestimated one task",
        highlights: "Better focus blocks",
        nextWeekGoals: "Close two deals",
        needHelpWith: "None",
      },
      metrics,
    );
    const headings = output
      .split("\n")
      .filter((line) => line.startsWith("## "))
      .map((line) => line.replace("## ", ""));
    expect(headings).toEqual([
      "Done this week",
      "Numbers",
      "What didn't work / mistakes",
      "Key takeaways",
      "Next week's goals",
      "Need help with",
    ]);
    expect(output).toContain("Shipped the dashboard");
  });

  it("renders auto-pulled numbers and a placeholder for empty sections", () => {
    const numbers = renderNumbersSection(metrics);
    expect(numbers).toContain("Leads created: 4");
    expect(numbers).toContain("Sessions completed: 12/15 (80%)");
    expect(numbers).toContain("Tasks completed: 8/10 (80%)");

    const output = renderWeeklyReport(
      {
        summary: "",
        challenges: "",
        highlights: "",
        nextWeekGoals: "",
        needHelpWith: "",
      },
      metrics,
    );
    expect(output).toContain("## Done this week\n—");
  });
});
