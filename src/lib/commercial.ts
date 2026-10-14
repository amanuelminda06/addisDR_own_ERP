import { addDays, endOfMonth } from "./datetime";
import { toNumber } from "./utils";

/**
 * Pure commercial & marketing business rules for AddisDR ERP.
 * No I/O: every function takes plain data so it can be unit tested.
 */

export type LeadStatusValue =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "WON"
  | "LOST";

export type LeadPriorityValue = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type MilestoneStageValue =
  | "FIRST_CONTACT"
  | "NEEDS_ASSESSMENT"
  | "PROPOSAL_SENT"
  | "FOLLOW_UP"
  | "NEGOTIATION"
  | "DECISION"
  | "CONTRACT";

export type FollowUpStatusValue = "SCHEDULED" | "COMPLETED" | "CANCELLED";

export type MarketingChannelValue =
  | "REFERRAL"
  | "SOCIAL_MEDIA"
  | "EMAIL"
  | "EVENT"
  | "CONTENT"
  | "PAID_ADS"
  | "DIRECT"
  | "PARTNERSHIP"
  | "OTHER";

/** Pipeline stages in order, from entry to close. */
export const PIPELINE_STAGES: LeadStatusValue[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
];

/** Open (not yet won/lost) statuses. */
export const OPEN_LEAD_STATUSES: LeadStatusValue[] = PIPELINE_STAGES;

export const CLOSED_LEAD_STATUSES: LeadStatusValue[] = ["WON", "LOST"];

/** Ordered communication milestones on a lead's journey. */
export const MILESTONE_STAGES: MilestoneStageValue[] = [
  "FIRST_CONTACT",
  "NEEDS_ASSESSMENT",
  "PROPOSAL_SENT",
  "FOLLOW_UP",
  "NEGOTIATION",
  "DECISION",
  "CONTRACT",
];

/**
 * Allowed lead status transitions. Movement is forward-only across open
 * stages; a lead may be lost from any open stage, won only from Proposal or
 * Negotiation, and a lost lead may be reopened as New. Won is terminal.
 */
export const LEAD_STATUS_TRANSITIONS: Record<
  LeadStatusValue,
  LeadStatusValue[]
> = {
  NEW: ["CONTACTED", "QUALIFIED", "LOST"],
  CONTACTED: ["QUALIFIED", "PROPOSAL", "LOST"],
  QUALIFIED: ["PROPOSAL", "NEGOTIATION", "LOST"],
  PROPOSAL: ["NEGOTIATION", "WON", "LOST"],
  NEGOTIATION: ["WON", "LOST"],
  WON: [],
  LOST: ["NEW"],
};

export function canTransitionLeadStatus(
  from: LeadStatusValue,
  to: LeadStatusValue,
): boolean {
  if (from === to) return true;
  return LEAD_STATUS_TRANSITIONS[from].includes(to);
}

export function isClosedLeadStatus(status: LeadStatusValue): boolean {
  return CLOSED_LEAD_STATUSES.includes(status);
}

export function isOpenLeadStatus(status: LeadStatusValue): boolean {
  return OPEN_LEAD_STATUSES.includes(status);
}

/** Next milestone after `stage`, or null when the journey is complete. */
export function nextMilestoneStage(
  stage: MilestoneStageValue,
): MilestoneStageValue | null {
  const idx = MILESTONE_STAGES.indexOf(stage);
  if (idx < 0 || idx >= MILESTONE_STAGES.length - 1) return null;
  return MILESTONE_STAGES[idx + 1];
}

export function milestoneStageIndex(stage: MilestoneStageValue): number {
  return MILESTONE_STAGES.indexOf(stage);
}

/** How far along the milestone journey a set of reached stages is, in [0, 1]. */
export function milestoneProgress(stages: MilestoneStageValue[]): number {
  if (stages.length === 0) return 0;
  const highest = Math.max(...stages.map((s) => milestoneStageIndex(s)));
  if (highest < 0) return 0;
  return (highest + 1) / MILESTONE_STAGES.length;
}

export type LeadLike = {
  status: LeadStatusValue;
  estimatedValue?: unknown;
  probability?: unknown;
  expectedCloseAt?: Date | string | null;
  lastContactedAt?: Date | string | null;
  marketingActivityId?: string | null;
  convertedAt?: Date | string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

/** Sum of estimated value across a set of leads. */
export function sumEstimatedValue(leads: LeadLike[]): number {
  return leads.reduce((sum, l) => sum + toNumber(l.estimatedValue), 0);
}

/** Total value of open opportunities. */
export function pipelineValue(leads: LeadLike[]): number {
  return sumEstimatedValue(leads.filter((l) => isOpenLeadStatus(l.status)));
}

/**
 * Probability-weighted pipeline: each open lead's value scaled by its
 * probability. Probability is stored as a percentage (0–100).
 */
export function weightedPipeline(leads: LeadLike[]): number {
  return leads
    .filter((l) => isOpenLeadStatus(l.status))
    .reduce((sum, l) => {
      const value = toNumber(l.estimatedValue);
      const probability = Math.min(Math.max(toNumber(l.probability), 0), 100);
      return sum + (value * probability) / 100;
    }, 0);
}

/** Won / (won + lost). Returns 0 when nothing has closed. */
export function winRate(won: number, lost: number): number {
  const closed = won + lost;
  if (closed <= 0) return 0;
  return won / closed;
}

/** (won + lost) / total — the share of leads that reached a decision. */
export function conversionRate(won: number, lost: number, total: number): number {
  if (total <= 0) return 0;
  return (won + lost) / total;
}

export function averageDealSize(wonValues: number[]): number {
  if (wonValues.length === 0) return 0;
  return wonValues.reduce((sum, v) => sum + v, 0) / wonValues.length;
}

export type PipelineSummary = {
  total: number;
  open: number;
  won: number;
  lost: number;
  pipelineValue: number;
  weightedPipeline: number;
  wonValue: number;
  averageDealSize: number;
  winRate: number;
  conversionRate: number;
  byStatus: Record<LeadStatusValue, number>;
};

/** Aggregate a set of leads into the headline commercial metrics. */
export function summarizePipeline(leads: LeadLike[]): PipelineSummary {
  const byStatus = Object.fromEntries(
    [...PIPELINE_STAGES, "WON", "LOST"].map((s) => [s, 0]),
  ) as Record<LeadStatusValue, number>;

  const wonValues: number[] = [];
  let wonValue = 0;

  for (const lead of leads) {
    byStatus[lead.status] = (byStatus[lead.status] ?? 0) + 1;
    if (lead.status === "WON") {
      const value = toNumber(lead.estimatedValue);
      wonValues.push(value);
      wonValue += value;
    }
  }

  const won = byStatus.WON;
  const lost = byStatus.LOST;
  const open = OPEN_LEAD_STATUSES.reduce((sum, s) => sum + byStatus[s], 0);

  return {
    total: leads.length,
    open,
    won,
    lost,
    pipelineValue: pipelineValue(leads),
    weightedPipeline: weightedPipeline(leads),
    wonValue,
    averageDealSize: averageDealSize(wonValues),
    winRate: winRate(won, lost),
    conversionRate: conversionRate(won, lost, leads.length),
    byStatus,
  };
}

export type ExpectedCloseBucket =
  | "overdue"
  | "this_month"
  | "next_month"
  | "later";

/** Bucket an expected close date relative to `now` (month granularity). */
export function bucketExpectedClose(
  expectedCloseAt: Date | string | null | undefined,
  now: Date,
): ExpectedCloseBucket | null {
  if (!expectedCloseAt) return null;
  const when = new Date(expectedCloseAt);
  if (Number.isNaN(when.getTime())) return null;
  if (when.getTime() < now.getTime()) return "overdue";

  const thisEnd = addDays(endOfMonth(now), 1);
  if (when < thisEnd) return "this_month";

  const nextEnd = addDays(endOfMonth(addDays(thisEnd, 1)), 1);
  if (when < nextEnd) return "next_month";

  return "later";
}

/** A lead with no contact for at least `days` is considered stale. */
export function isLeadStale(
  lastContactedAt: Date | string | null | undefined,
  now: Date,
  days = 14,
): boolean {
  if (!lastContactedAt) return true;
  const when = new Date(lastContactedAt);
  if (Number.isNaN(when.getTime())) return true;
  return now.getTime() - when.getTime() > days * 86_400_000;
}

/** Effective follow-up status: a scheduled item past its due date is overdue. */
export function effectiveFollowUpStatus(
  followUp: { status: FollowUpStatusValue; dueAt: Date | string },
  now: Date,
): FollowUpStatusValue | "OVERDUE" {
  if (followUp.status !== "SCHEDULED") return followUp.status;
  return new Date(followUp.dueAt).getTime() < now.getTime()
    ? "OVERDUE"
    : "SCHEDULED";
}

/** A lead is convertible once won and not already linked to a client. */
export function isLeadConvertible(lead: {
  status: LeadStatusValue;
  hasClient: boolean;
}): boolean {
  return lead.status === "WON" && !lead.hasClient;
}

/** Cost per acquired lead. Returns 0 when no leads were attributed. */
export function costPerLead(spend: unknown, leadCount: number): number {
  if (leadCount <= 0) return 0;
  return toNumber(spend) / leadCount;
}

/** Share of leads attributed to a marketing activity, in [0, 1]. */
export function attributionRate(attributed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(attributed / total, 1);
}

export type MarketingActivityLike = {
  id: string;
  channel: MarketingChannelValue;
  budget?: unknown;
  spend?: unknown;
};

export type ChannelBreakdown = {
  channel: MarketingChannelValue;
  activities: number;
  budget: number;
  spend: number;
  leads: number;
  won: number;
  wonValue: number;
  costPerLead: number;
};

/**
 * Roll marketing activities and the leads they generated up by channel.
 * Leads are matched through `marketingActivityId`.
 */
export function channelBreakdown(
  activities: MarketingActivityLike[],
  leads: (LeadLike & { marketingActivityId?: string | null })[],
): ChannelBreakdown[] {
  const byChannel = new Map<MarketingChannelValue, ChannelBreakdown>();

  const get = (channel: MarketingChannelValue): ChannelBreakdown => {
    const existing = byChannel.get(channel);
    if (existing) return existing;
    const fresh: ChannelBreakdown = {
      channel,
      activities: 0,
      budget: 0,
      spend: 0,
      leads: 0,
      won: 0,
      wonValue: 0,
      costPerLead: 0,
    };
    byChannel.set(channel, fresh);
    return fresh;
  };

  const activityChannel = new Map<string, MarketingChannelValue>();
  for (const activity of activities) {
    activityChannel.set(activity.id, activity.channel);
    const bucket = get(activity.channel);
    bucket.activities += 1;
    bucket.budget += toNumber(activity.budget);
    bucket.spend += toNumber(activity.spend);
  }

  for (const lead of leads) {
    if (!lead.marketingActivityId) continue;
    const channel = activityChannel.get(lead.marketingActivityId);
    if (!channel) continue;
    const bucket = get(channel);
    bucket.leads += 1;
    if (lead.status === "WON") {
      bucket.won += 1;
      bucket.wonValue += toNumber(lead.estimatedValue);
    }
  }

  const result = [...byChannel.values()];
  for (const bucket of result) {
    bucket.costPerLead = costPerLead(bucket.spend, bucket.leads);
  }
  return result;
}

export type DateRange = { from: Date; to: Date };

export type CommercialWindowSummary = {
  created: number;
  won: number;
  lost: number;
  wonValue: number;
  createdValue: number;
  pipelineValue: number;
  weightedPipeline: number;
};

function inRange(
  value: Date | string | null | undefined,
  range: DateRange,
): boolean {
  if (!value) return false;
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return false;
  return t >= range.from.getTime() && t < range.to.getTime();
}

/**
 * Commercial results for a reporting window (used by weekly reporting).
 * "Won" is dated by `convertedAt`, falling back to `updatedAt` for won leads
 * that were not explicitly converted. Lost leads carry no dedicated date in
 * the schema, so they are only counted when the range covers all time.
 */
export function summarizeCommercialWindow(
  leads: LeadLike[],
  range: DateRange,
  options: { countLostInRange?: boolean } = {},
): CommercialWindowSummary {
  const created = leads.filter((l) => inRange(l.createdAt, range));
  const wonInRange = leads.filter(
    (l) =>
      l.status === "WON" &&
      (inRange(l.convertedAt, range) || (!l.convertedAt && inRange(l.updatedAt, range))),
  );
  const lostInRange = options.countLostInRange
    ? leads.filter((l) => l.status === "LOST" && inRange(l.updatedAt, range))
    : [];

  return {
    created: created.length,
    won: wonInRange.length,
    lost: lostInRange.length,
    wonValue: sumEstimatedValue(wonInRange),
    createdValue: sumEstimatedValue(created),
    pipelineValue: pipelineValue(leads),
    weightedPipeline: weightedPipeline(leads),
  };
}
