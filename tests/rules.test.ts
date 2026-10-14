import { describe, it, expect } from "vitest";
import {
  allowanceStatus,
  completionRate,
  computeAllocations,
  effectiveReminderStatus,
  isOverdue,
  isWorkday,
  netProfit,
  plannedHoursForSessions,
  plannedSessionsPerWeek,
  weeklyPlannedHours,
  workdaysInWeek,
  type AllocationRule,
} from "@/lib/rules";

describe("work schedule rules", () => {
  it("counts Monday–Friday as workdays", () => {
    const monday = new Date("2026-10-12T00:00:00.000Z");
    const saturday = new Date("2026-10-17T00:00:00.000Z");
    const sunday = new Date("2026-10-18T00:00:00.000Z");
    expect(isWorkday(monday)).toBe(true);
    expect(isWorkday(saturday)).toBe(false);
    expect(isWorkday(sunday)).toBe(false);
  });

  it("has five workdays per week and fifteen planned sessions", () => {
    expect(workdaysInWeek(new Date("2026-10-15T00:00:00.000Z"))).toBe(5);
    expect(plannedSessionsPerWeek()).toBe(15);
  });

  it("plans nine hours per day and forty-five hours per week", () => {
    expect(plannedHoursForSessions(3)).toBe(9);
    expect(weeklyPlannedHours).toBe(45);
  });
});

describe("monthly allowance discipline", () => {
  it("is safe below 75%", () => {
    const s = allowanceStatus(15000, 30000);
    expect(s.level).toBe("safe");
    expect(s.remaining).toBe(15000);
    expect(s.percentUsed).toBeCloseTo(0.5);
    expect(s.overLimit).toBe(false);
  });

  it("warns at 75% and is critical at 90%", () => {
    expect(allowanceStatus(22500, 30000).level).toBe("warning");
    expect(allowanceStatus(27000, 30000).level).toBe("critical");
  });

  it("flags spending over the limit", () => {
    const s = allowanceStatus(31000, 30000);
    expect(s.level).toBe("over");
    expect(s.overLimit).toBe(true);
    expect(s.remaining).toBe(-1000);
  });
});

describe("financial allocations", () => {
  const rules: AllocationRule[] = [
    { category: "TAX", method: "PERCENT", value: 30, isActive: true },
    { category: "TITHE", method: "PERCENT", value: 10, isActive: true },
    { category: "SAVINGS", method: "PERCENT", value: 20, isActive: true },
    { category: "PERSONAL", method: "FIXED", value: 30000, isActive: true },
    { category: "OTHER", method: "FIXED", value: 5000, isActive: false },
  ];

  it("reserves tax, tithe and savings before personal spending", () => {
    const result = computeAllocations(100000, rules);
    expect(result.totalReserved).toBe(60000);
    expect(result.unallocated).toBe(40000);
    expect(result.allocations.find((a) => a.category === "TAX")?.amount).toBe(30000);
  });

  it("ignores inactive rules", () => {
    const result = computeAllocations(100000, rules);
    expect(result.allocations.some((a) => a.category === "OTHER")).toBe(false);
  });

  it("computes net profit as income minus expenses", () => {
    expect(netProfit(100000, 40000)).toBe(60000);
    expect(netProfit(0, 0)).toBe(0);
  });
});

describe("reminders", () => {
  const now = new Date("2026-10-15T12:00:00.000Z");

  it("reports a past pending reminder as overdue without persisting", () => {
    const status = effectiveReminderStatus(
      { status: "PENDING", dueAt: "2026-10-14T12:00:00.000Z" },
      now,
    );
    expect(status).toBe("OVERDUE");
  });

  it("keeps a future pending reminder pending", () => {
    const status = effectiveReminderStatus(
      { status: "PENDING", dueAt: "2026-10-16T12:00:00.000Z" },
      now,
    );
    expect(status).toBe("PENDING");
  });

  it("does not alter completed or dismissed status", () => {
    expect(
      effectiveReminderStatus(
        { status: "COMPLETED", dueAt: "2026-10-14T12:00:00.000Z" },
        now,
      ),
    ).toBe("COMPLETED");
    expect(
      effectiveReminderStatus(
        { status: "DISMISSED", dueAt: "2026-10-14T12:00:00.000Z" },
        now,
      ),
    ).toBe("DISMISSED");
  });

  it("detects overdue dates", () => {
    expect(isOverdue("2026-10-14T12:00:00.000Z", now)).toBe(true);
    expect(isOverdue("2026-10-16T12:00:00.000Z", now)).toBe(false);
  });
});

describe("completion rate", () => {
  it("returns a clamped fraction", () => {
    expect(completionRate(3, 5)).toBeCloseTo(0.6);
    expect(completionRate(10, 5)).toBe(1);
    expect(completionRate(0, 0)).toBe(0);
  });
});
