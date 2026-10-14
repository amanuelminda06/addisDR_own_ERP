import { describe, it, expect } from "vitest";
import { summarizeProjectCollection } from "@/lib/finance";

describe("project collection tracking", () => {
  it("calculates agreed price, collected total and outstanding balance", () => {
    const summary = summarizeProjectCollection(
      { agreedPrice: 100000 },
      [{ amount: 5000 }, { amount: 30000 }, { amount: 20000 }],
    );
    expect(summary.agreedValue).toBe(100000);
    expect(summary.totalCollected).toBe(55000);
    expect(summary.outstandingBalance).toBe(45000);
    expect(summary.collectedPct).toBeCloseTo(0.55);
    expect(summary.isFullyPaid).toBe(false);
    expect(summary.payments).toBe(3);
  });

  it("marks full payment as fully paid", () => {
    const summary = summarizeProjectCollection(
      { agreedPrice: 55000 },
      [{ amount: 5000 }, { amount: 50000 }],
    );
    expect(summary.totalCollected).toBe(55000);
    expect(summary.outstandingBalance).toBe(0);
    expect(summary.isFullyPaid).toBe(true);
    expect(summary.isOverpaid).toBe(false);
  });

  it("handles overpayment", () => {
    const summary = summarizeProjectCollection(
      { agreedPrice: 50000 },
      [{ amount: 30000 }, { amount: 30000 }],
    );
    expect(summary.totalCollected).toBe(60000);
    expect(summary.outstandingBalance).toBe(0);
    expect(summary.isOverpaid).toBe(true);
  });

  it("falls back to budget for agreed price", () => {
    const summary = summarizeProjectCollection(
      { budget: 10000 },
      [{ amount: 2000 }],
    );
    expect(summary.agreedValue).toBe(10000);
    expect(summary.outstandingBalance).toBe(8000);
  });

  it("counts overdue and remaining milestones", () => {
    const now = new Date("2026-10-15T12:00:00.000Z");
    const summary = summarizeProjectCollection(
      { agreedPrice: 100000 },
      [{ amount: 5000 }],
      [
        {
          expectedAmount: 30000,
          expectedDate: "2026-10-01T00:00:00.000Z",
          receivedAmount: 5000,
          status: "PARTIAL",
        },
        {
          expectedAmount: 65000,
          expectedDate: "2026-11-01T00:00:00.000Z",
          receivedAmount: 0,
          status: "PENDING",
        },
        {
          expectedAmount: 100000,
          expectedDate: "2026-09-01T00:00:00.000Z",
          receivedAmount: 100000,
          status: "RECEIVED",
        },
      ],
      now,
    );
    expect(summary.remainingMilestones).toBe(2);
    expect(summary.overdueMilestones).toBe(1);
  });
});
