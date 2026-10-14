import { describe, it, expect } from "vitest";
import {
  canTransitionLeadStatus,
  isClosedLeadStatus,
  isOpenLeadStatus,
  nextMilestoneStage,
  milestoneProgress,
  pipelineValue,
  weightedPipeline,
  winRate,
  conversionRate,
  averageDealSize,
  summarizePipeline,
  bucketExpectedClose,
  isLeadStale,
  effectiveFollowUpStatus,
  isLeadConvertible,
  costPerLead,
  attributionRate,
  channelBreakdown,
  summarizeCommercialWindow,
  type LeadLike,
  type MarketingActivityLike,
} from "@/lib/commercial";

const lead = (over: Partial<LeadLike>): LeadLike => ({
  status: "NEW",
  estimatedValue: 0,
  probability: 0,
  ...over,
});

describe("lead status transitions", () => {
  it("allows forward moves across open stages", () => {
    expect(canTransitionLeadStatus("NEW", "CONTACTED")).toBe(true);
    expect(canTransitionLeadStatus("QUALIFIED", "PROPOSAL")).toBe(true);
    expect(canTransitionLeadStatus("PROPOSAL", "WON")).toBe(true);
    expect(canTransitionLeadStatus("NEGOTIATION", "WON")).toBe(true);
  });

  it("allows losing a lead from any open stage", () => {
    for (const s of ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION"] as const) {
      expect(canTransitionLeadStatus(s, "LOST")).toBe(true);
    }
  });

  it("forbids winning before a proposal", () => {
    expect(canTransitionLeadStatus("NEW", "WON")).toBe(false);
    expect(canTransitionLeadStatus("CONTACTED", "WON")).toBe(false);
    expect(canTransitionLeadStatus("QUALIFIED", "WON")).toBe(false);
  });

  it("treats won as terminal and allows reopening lost", () => {
    expect(canTransitionLeadStatus("WON", "NEGOTIATION")).toBe(false);
    expect(canTransitionLeadStatus("WON", "LOST")).toBe(false);
    expect(canTransitionLeadStatus("LOST", "NEW")).toBe(true);
  });

  it("allows a no-op transition to the same status", () => {
    expect(canTransitionLeadStatus("QUALIFIED", "QUALIFIED")).toBe(true);
  });

  it("classifies open and closed statuses", () => {
    expect(isOpenLeadStatus("NEGOTIATION")).toBe(true);
    expect(isOpenLeadStatus("WON")).toBe(false);
    expect(isClosedLeadStatus("LOST")).toBe(true);
  });
});

describe("communication milestones", () => {
  it("advances to the next stage and stops at the end", () => {
    expect(nextMilestoneStage("FIRST_CONTACT")).toBe("NEEDS_ASSESSMENT");
    expect(nextMilestoneStage("DECISION")).toBe("CONTRACT");
    expect(nextMilestoneStage("CONTRACT")).toBeNull();
  });

  it("computes milestone progress", () => {
    expect(milestoneProgress([])).toBe(0);
    expect(milestoneProgress(["FIRST_CONTACT"])).toBeCloseTo(1 / 7);
    expect(milestoneProgress(["CONTRACT"])).toBe(1);
  });
});

describe("pipeline metrics", () => {
  const leads: LeadLike[] = [
    lead({ status: "NEW", estimatedValue: 10000, probability: 10 }),
    lead({ status: "PROPOSAL", estimatedValue: 20000, probability: 50 }),
    lead({ status: "WON", estimatedValue: 30000, probability: 100 }),
    lead({ status: "LOST", estimatedValue: 5000, probability: 0 }),
  ];

  it("sums open pipeline value only", () => {
    expect(pipelineValue(leads)).toBe(30000);
  });

  it("weights open leads by probability", () => {
    expect(weightedPipeline(leads)).toBe(10000 * 0.1 + 20000 * 0.5);
  });

  it("clamps out-of-range probabilities", () => {
    expect(weightedPipeline([lead({ status: "NEW", estimatedValue: 1000, probability: 150 })])).toBe(1000);
    expect(weightedPipeline([lead({ status: "NEW", estimatedValue: 1000, probability: -5 })])).toBe(0);
  });

  it("computes win rate, conversion rate and average deal size", () => {
    expect(winRate(3, 1)).toBeCloseTo(0.75);
    expect(winRate(0, 0)).toBe(0);
    expect(conversionRate(1, 1, 4)).toBeCloseTo(0.5);
    expect(averageDealSize([10000, 30000])).toBe(20000);
    expect(averageDealSize([])).toBe(0);
  });

  it("aggregates a pipeline summary", () => {
    const s = summarizePipeline(leads);
    expect(s.total).toBe(4);
    expect(s.open).toBe(2);
    expect(s.won).toBe(1);
    expect(s.lost).toBe(1);
    expect(s.wonValue).toBe(30000);
    expect(s.averageDealSize).toBe(30000);
    expect(s.winRate).toBeCloseTo(0.5);
    expect(s.byStatus.NEW).toBe(1);
  });
});

describe("expected close bucketing", () => {
  const now = new Date("2026-10-15T12:00:00.000Z");

  it("returns null without a date", () => {
    expect(bucketExpectedClose(null, now)).toBeNull();
  });

  it("buckets overdue, this month, next month and later", () => {
    expect(bucketExpectedClose("2026-10-01T00:00:00.000Z", now)).toBe("overdue");
    expect(bucketExpectedClose("2026-10-31T00:00:00.000Z", now)).toBe("this_month");
    expect(bucketExpectedClose("2026-11-15T00:00:00.000Z", now)).toBe("next_month");
    expect(bucketExpectedClose("2027-02-01T00:00:00.000Z", now)).toBe("later");
  });
});

describe("lead staleness", () => {
  const now = new Date("2026-10-15T12:00:00.000Z");
  it("flags leads without contact", () => {
    expect(isLeadStale(null, now)).toBe(true);
    expect(isLeadStale("2026-10-01T00:00:00.000Z", now, 14)).toBe(true);
    expect(isLeadStale("2026-10-14T00:00:00.000Z", now, 14)).toBe(false);
  });
});

describe("follow-up status", () => {
  const now = new Date("2026-10-15T12:00:00.000Z");
  it("reports a scheduled overdue follow-up as overdue without persisting", () => {
    expect(
      effectiveFollowUpStatus({ status: "SCHEDULED", dueAt: "2026-10-14T00:00:00.000Z" }, now),
    ).toBe("OVERDUE");
    expect(
      effectiveFollowUpStatus({ status: "SCHEDULED", dueAt: "2026-10-16T00:00:00.000Z" }, now),
    ).toBe("SCHEDULED");
  });
  it("leaves completed and cancelled untouched", () => {
    expect(
      effectiveFollowUpStatus({ status: "COMPLETED", dueAt: "2026-10-01T00:00:00.000Z" }, now),
    ).toBe("COMPLETED");
    expect(
      effectiveFollowUpStatus({ status: "CANCELLED", dueAt: "2026-10-01T00:00:00.000Z" }, now),
    ).toBe("CANCELLED");
  });
});

describe("lead conversion", () => {
  it("only converts won leads without an existing client", () => {
    expect(isLeadConvertible({ status: "WON", hasClient: false })).toBe(true);
    expect(isLeadConvertible({ status: "WON", hasClient: true })).toBe(false);
    expect(isLeadConvertible({ status: "NEGOTIATION", hasClient: false })).toBe(false);
  });
});

describe("marketing attribution", () => {
  it("computes cost per lead safely", () => {
    expect(costPerLead(5000, 10)).toBe(500);
    expect(costPerLead(5000, 0)).toBe(0);
  });

  it("computes attribution rate", () => {
    expect(attributionRate(3, 10)).toBeCloseTo(0.3);
    expect(attributionRate(20, 10)).toBe(1);
    expect(attributionRate(0, 0)).toBe(0);
  });

  it("rolls activities and leads up by channel", () => {
    const activities: MarketingActivityLike[] = [
      { id: "a1", channel: "SOCIAL_MEDIA", budget: 10000, spend: 8000 },
      { id: "a2", channel: "REFERRAL", budget: 0, spend: 2000 },
    ];
    const leads: LeadLike[] = [
      lead({ status: "NEW", marketingActivityId: "a1" }),
      lead({ status: "WON", estimatedValue: 50000, marketingActivityId: "a1" }),
      lead({ status: "NEW", marketingActivityId: "a2" }),
      lead({ status: "NEW", marketingActivityId: null }),
    ];
    const breakdown = channelBreakdown(activities, leads);
    const social = breakdown.find((b) => b.channel === "SOCIAL_MEDIA")!;
    expect(social.leads).toBe(2);
    expect(social.won).toBe(1);
    expect(social.wonValue).toBe(50000);
    expect(social.costPerLead).toBe(4000);

    const referral = breakdown.find((b) => b.channel === "REFERRAL")!;
    expect(referral.leads).toBe(1);
    expect(referral.costPerLead).toBe(2000);
  });
});

describe("commercial window summary", () => {
  it("counts leads created and won within the window", () => {
    const range = { from: new Date("2026-10-12T00:00:00.000Z"), to: new Date("2026-10-19T00:00:00.000Z") };
    const leads: LeadLike[] = [
      lead({ status: "NEW", estimatedValue: 5000, createdAt: "2026-10-13T09:00:00.000Z" }),
      lead({
        status: "WON",
        estimatedValue: 20000,
        createdAt: "2026-10-01T09:00:00.000Z",
        convertedAt: "2026-10-14T09:00:00.000Z",
      }),
      lead({ status: "QUALIFIED", estimatedValue: 8000, createdAt: "2026-10-20T09:00:00.000Z" }),
    ];
    const summary = summarizeCommercialWindow(leads, range);
    expect(summary.created).toBe(1);
    expect(summary.won).toBe(1);
    expect(summary.wonValue).toBe(20000);
    expect(summary.pipelineValue).toBe(13000);
  });
});
