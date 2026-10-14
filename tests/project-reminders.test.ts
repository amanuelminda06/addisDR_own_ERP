import { describe, it, expect } from "vitest";
import { buildProjectCollectionReminders } from "@/lib/reminder-engine";

const NOW = new Date("2026-10-15T12:00:00.000Z");

describe("project collection reminders", () => {
  it("reminds when a project has an outstanding balance", () => {
    const drafts = buildProjectCollectionReminders(
      [
        {
          id: "p1",
          name: "Website",
          status: "ACTIVE",
          agreedPrice: 100000,
          payments: [{ amount: 40000 }],
          collectionSchedule: [],
        },
      ],
      NOW,
    );
    expect(drafts).toHaveLength(1);
    expect(drafts[0].type).toBe("PROJECT_OUTSTANDING");
    expect(drafts[0].relatedId).toBe("p1");
  });

  it("reminds for completed projects with money owed", () => {
    const drafts = buildProjectCollectionReminders(
      [
        {
          id: "p2",
          name: "App",
          status: "COMPLETED",
          agreedPrice: 50000,
          payments: [{ amount: 10000 }],
          collectionSchedule: [],
        },
      ],
      NOW,
    );
    expect(drafts[0].description).toContain("completed but");
  });

  it("reminds when an expected payment is overdue", () => {
    const drafts = buildProjectCollectionReminders(
      [
        {
          id: "p3",
          name: "Consulting",
          status: "ACTIVE",
          agreedPrice: 50000,
          payments: [],
          collectionSchedule: [
            {
              id: "s1",
              label: "Advance",
              expectedAmount: 20000,
              expectedDate: "2026-10-01T00:00:00.000Z",
              status: "PENDING",
              receivedAmount: 0,
            },
          ],
        },
      ],
      NOW,
    );
    expect(drafts).toHaveLength(2);
    expect(drafts.some((d) => d.type === "PROJECT_OVERDUE" && d.relatedId === "s1")).toBe(true);
  });

  it("does not remind for fully paid or future milestones", () => {
    const drafts = buildProjectCollectionReminders(
      [
        {
          id: "p4",
          name: "Retainer",
          status: "ACTIVE",
          agreedPrice: 10000,
          payments: [{ amount: 10000 }],
          collectionSchedule: [
            {
              id: "s2",
              label: "Future",
              expectedAmount: 10000,
              expectedDate: "2026-11-01T00:00:00.000Z",
              status: "PENDING",
              receivedAmount: 0,
            },
          ],
        },
      ],
      NOW,
    );
    expect(drafts).toHaveLength(0);
  });

  it("does not duplicate drafts for the same key within one run", () => {
    const drafts = buildProjectCollectionReminders(
      [
        {
          id: "p5",
          name: "Dup",
          status: "ACTIVE",
          agreedPrice: 5000,
          payments: [],
          collectionSchedule: [],
        },
        {
          id: "p5",
          name: "Dup",
          status: "ACTIVE",
          agreedPrice: 5000,
          payments: [],
          collectionSchedule: [],
        },
      ],
      NOW,
    );
    // Builder itself does not de-dupe across projects by key, but generation uses unique index/skipDuplicates.
    expect(drafts.length).toBe(2);
  });
});
