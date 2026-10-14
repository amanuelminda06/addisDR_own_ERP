import { describe, expect, it } from "vitest";
import {
  planReminderResolutions,
  type PendingReminder,
  type ReminderFactSet,
} from "@/lib/daily-work";

const EMPTY_FACTS: ReminderFactSet = {
  openSessionDays: [],
  openOverdueTaskIds: [],
  submittedWeekPlanIds: [],
  deletedWeekPlanIds: [],
  existingPlanStarts: [],
};

function facts(overrides: Partial<ReminderFactSet> = {}): ReminderFactSet {
  return { ...EMPTY_FACTS, ...overrides };
}

function pending(
  type: string,
  relatedId: string | null,
  id = "r1",
): PendingReminder {
  return { id, type, relatedId };
}

describe("planReminderResolutions", () => {
  it("resolves a work-session reminder once no session is open", () => {
    const reminders = [pending("WORK_SESSION", "2026-10-12")];
    const resolved = planReminderResolutions(
      reminders,
      facts({ openSessionDays: ["2026-10-13"] }),
    );
    expect(resolved).toEqual(["r1"]);
  });

  it("keeps a work-session reminder while its day is still open", () => {
    const resolved = planReminderResolutions(
      [pending("WORK_SESSION", "2026-10-12")],
      facts({ openSessionDays: ["2026-10-12"] }),
    );
    expect(resolved).toEqual([]);
  });

  it("resolves an overdue-task reminder once the task leaves the open set", () => {
    expect(
      planReminderResolutions(
        [pending("OVERDUE_TASK", "t1")],
        facts({ openOverdueTaskIds: [] }),
      ),
    ).toEqual(["r1"]);
  });

  it("keeps an overdue-task reminder while the task is still open and overdue", () => {
    expect(
      planReminderResolutions(
        [pending("OVERDUE_TASK", "t1")],
        facts({ openOverdueTaskIds: ["t1"] }),
      ),
    ).toEqual([]);
  });

  it("resolves a missing-report reminder when the report is submitted", () => {
    expect(
      planReminderResolutions(
        [pending("MISSING_REPORT", "wp1")],
        facts({ submittedWeekPlanIds: ["wp1"] }),
      ),
    ).toEqual(["r1"]);
  });

  it("resolves a missing-report reminder when its week plan was deleted", () => {
    expect(
      planReminderResolutions(
        [pending("MISSING_REPORT", "wp1")],
        facts({ deletedWeekPlanIds: ["wp1"] }),
      ),
    ).toEqual(["r1"]);
  });

  it("keeps a missing-report reminder while a draft report exists", () => {
    expect(
      planReminderResolutions([pending("MISSING_REPORT", "wp1")], facts()),
    ).toEqual([]);
  });

  it("resolves a weekly-planning reminder once the next week is planned", () => {
    const weekStart = "2026-10-19T00:00:00.000Z";
    expect(
      planReminderResolutions(
        [pending("WEEKLY_PLANNING", weekStart)],
        facts({ existingPlanStarts: [weekStart] }),
      ),
    ).toEqual(["r1"]);
  });

  it("keeps a weekly-planning reminder while the week is unplanned", () => {
    expect(
      planReminderResolutions(
        [pending("WEEKLY_PLANNING", "2026-10-19T00:00:00.000Z")],
        facts(),
      ),
    ).toEqual([]);
  });

  it("never resolves monthly finance or performance reminders", () => {
    const reminders = [
      pending("MONTHLY_FINANCE", "2026-09", "a"),
      pending("MONTHLY_PERFORMANCE", "2026-09", "b"),
    ];
    expect(planReminderResolutions(reminders, facts())).toEqual([]);
  });

  it("ignores reminders without a related record", () => {
    expect(
      planReminderResolutions([pending("WORK_SESSION", null)], facts()),
    ).toEqual([]);
  });

  it("resolves only the reminders whose obligation is met, in id order", () => {
    const reminders = [
      pending("OVERDUE_TASK", "t1", "a"), // met
      pending("OVERDUE_TASK", "t2", "b"), // still open
      pending("WORK_SESSION", "2026-10-12", "c"), // met
      pending("WEEKLY_PLANNING", "2026-10-19T00:00:00.000Z", "d"), // still unplanned
    ];
    const resolved = planReminderResolutions(
      reminders,
      facts({
        openOverdueTaskIds: ["t2"],
        openSessionDays: ["2026-10-13"],
      }),
    );
    expect(resolved).toEqual(["a", "c"]);
  });

  it("is pure — the input reminders and facts are not mutated", () => {
    const reminders = [pending("OVERDUE_TASK", "t1")];
    const reminderSnapshot = JSON.parse(JSON.stringify(reminders));
    const factSet = facts({ openOverdueTaskIds: [] });
    const factSnapshot = JSON.parse(JSON.stringify(factSet));
    planReminderResolutions(reminders, factSet);
    expect(reminders).toEqual(reminderSnapshot);
    expect(factSet).toEqual(factSnapshot);
  });
});
