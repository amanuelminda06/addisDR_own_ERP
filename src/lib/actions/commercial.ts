"use server";

import { revalidatePath } from "next/cache";
import { fromZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { APP_TIMEZONE } from "@/lib/constants";
import { zonedDateOnly, zonedNow } from "@/lib/datetime";
import {
  convertLeadSchema,
  followUpCompleteSchema,
  followUpCreateSchema,
  followUpRescheduleSchema,
  leadCreateSchema,
  leadUpdateSchema,
  milestoneCreateSchema,
} from "@/lib/validation";
import {
  canTransitionLeadStatus,
  isLeadConvertible,
  type LeadStatusValue,
} from "@/lib/commercial";
import type { ContactType, MilestoneStage, Prisma } from "@prisma/client";

export type CommercialFormState = { error?: string; success?: string } | null;

const FOLLOWUP_RELATED_TYPE = "FollowUp";

/** Mapping from a pipeline stage to the milestone it implies. */
const STATUS_MILESTONE: Partial<Record<LeadStatusValue, MilestoneStage>> = {
  NEW: "FIRST_CONTACT",
  CONTACTED: "FIRST_CONTACT",
  QUALIFIED: "NEEDS_ASSESSMENT",
  PROPOSAL: "PROPOSAL_SENT",
  NEGOTIATION: "NEGOTIATION",
  WON: "CONTRACT",
};

function firstError(issues: { message: string }[]): string {
  return issues[0]?.message ?? "Invalid input";
}

function textOrNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function moneyOrNull(value: string | number | undefined): number | null {
  if (value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function intOrNull(value: string | number | undefined): number | null {
  if (value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function dateTimeOrNull(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return fromZonedTime(value, APP_TIMEZONE);
}

function dateOnlyOrNull(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return zonedDateOnly(value);
}

async function ensureMilestone(
  tx: Prisma.TransactionClient,
  leadId: string,
  stage: MilestoneStage,
  at: Date,
): Promise<void> {
  const existing = await tx.communicationMilestone.findUnique({
    where: { leadId_stage: { leadId, stage } },
  });
  if (existing) return;
  await tx.communicationMilestone.create({
    data: { leadId, stage, reachedAt: at },
  });
}

/** Recompute the lead's next follow-up date from its scheduled follow-ups. */
async function recomputeNextFollowUp(
  tx: Prisma.TransactionClient,
  leadId: string,
): Promise<void> {
  const next = await tx.followUp.findFirst({
    where: { leadId, status: "SCHEDULED" },
    orderBy: { dueAt: "asc" },
    select: { dueAt: true },
  });
  await tx.lead.update({
    where: { id: leadId },
    data: { nextFollowUpAt: next?.dueAt ?? null },
  });
}

function revalidateCommercial(leadId?: string): void {
  revalidatePath("/commercial");
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  if (leadId) revalidatePath(`/commercial/leads/${leadId}`);
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export async function createLeadAction(
  _prev: CommercialFormState,
  formData: FormData,
): Promise<CommercialFormState> {
  await requireUser();
  const parsed = leadCreateSchema.safeParse({
    name: formData.get("name"),
    contactName: formData.get("contactName") ?? "",
    company: formData.get("company") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    category: formData.get("category") ?? "",
    area: formData.get("area") ?? "",
    address: formData.get("address") ?? "",
    source: formData.get("source") ?? "",
    status: formData.get("status") ?? "NEW",
    priority: formData.get("priority") ?? "MEDIUM",
    estimatedValue: formData.get("estimatedValue") ?? "",
    probability: formData.get("probability") ?? "",
    expectedCloseAt: formData.get("expectedCloseAt") ?? "",
    nextAction: formData.get("nextAction") ?? "",
    nextActionAt: formData.get("nextActionAt") ?? "",
    notes: formData.get("notes") ?? "",
    marketingActivityId: formData.get("marketingActivityId") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  const d = parsed.data;

  const lead = await prisma.lead.create({
    data: {
      name: d.name,
      contactName: textOrNull(d.contactName),
      company: textOrNull(d.company),
      email: textOrNull(d.email),
      phone: textOrNull(d.phone),
      category: textOrNull(d.category),
      area: textOrNull(d.area),
      address: textOrNull(d.address),
      source: textOrNull(d.source),
      status: d.status,
      priority: d.priority,
      estimatedValue: moneyOrNull(d.estimatedValue) ?? undefined,
      probability: intOrNull(d.probability) ?? 0,
      expectedCloseAt: dateOnlyOrNull(d.expectedCloseAt),
      nextAction: textOrNull(d.nextAction),
      nextActionAt: dateTimeOrNull(d.nextActionAt),
      notes: textOrNull(d.notes),
      marketingActivityId: textOrNull(d.marketingActivityId),
      convertedAt: d.status === "WON" ? new Date() : null,
    },
  });

  const implied = STATUS_MILESTONE[d.status];
  if (implied) await ensureMilestone(prisma, lead.id, implied, new Date());

  revalidateCommercial(lead.id);
  return { success: `Lead "${lead.name}" created.` };
}

export async function updateLeadAction(
  _prev: CommercialFormState,
  formData: FormData,
): Promise<CommercialFormState> {
  await requireUser();
  const parsed = leadUpdateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    contactName: formData.get("contactName") ?? "",
    company: formData.get("company") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    category: formData.get("category") ?? "",
    area: formData.get("area") ?? "",
    address: formData.get("address") ?? "",
    source: formData.get("source") ?? "",
    status: formData.get("status") ?? "NEW",
    priority: formData.get("priority") ?? "MEDIUM",
    estimatedValue: formData.get("estimatedValue") ?? "",
    probability: formData.get("probability") ?? "",
    expectedCloseAt: formData.get("expectedCloseAt") ?? "",
    nextAction: formData.get("nextAction") ?? "",
    nextActionAt: formData.get("nextActionAt") ?? "",
    notes: formData.get("notes") ?? "",
    lostReason: formData.get("lostReason") ?? "",
    marketingActivityId: formData.get("marketingActivityId") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  const d = parsed.data;

  const existing = await prisma.lead.findUnique({
    where: { id: d.id },
    select: { status: true, convertedAt: true },
  });
  if (!existing) return { error: "Lead not found." };

  if (!canTransitionLeadStatus(existing.status, d.status)) {
    return {
      error: `Cannot move a lead from ${existing.status} to ${d.status}.`,
    };
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: d.id },
      data: {
        name: d.name,
        contactName: textOrNull(d.contactName),
        company: textOrNull(d.company),
        email: textOrNull(d.email),
        phone: textOrNull(d.phone),
        category: textOrNull(d.category),
        area: textOrNull(d.area),
        address: textOrNull(d.address),
        source: textOrNull(d.source),
        status: d.status,
        priority: d.priority,
        estimatedValue: moneyOrNull(d.estimatedValue) ?? undefined,
        probability: intOrNull(d.probability) ?? 0,
        expectedCloseAt: dateOnlyOrNull(d.expectedCloseAt),
        nextAction: textOrNull(d.nextAction),
        nextActionAt: dateTimeOrNull(d.nextActionAt),
        notes: textOrNull(d.notes),
        lostReason: d.status === "LOST" ? textOrNull(d.lostReason) : null,
        marketingActivityId: textOrNull(d.marketingActivityId),
        convertedAt:
          d.status === "WON" ? (existing.convertedAt ?? now) : null,
      },
    });

    if (existing.status !== d.status) {
      const implied = STATUS_MILESTONE[d.status];
      if (implied) await ensureMilestone(tx, d.id, implied, now);
    }
  });

  revalidateCommercial(d.id);
  return { success: "Lead updated." };
}

export async function moveLeadStatusAction(
  leadId: string,
  status: LeadStatusValue,
): Promise<void> {
  await requireUser();
  const existing = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { status: true, convertedAt: true },
  });
  if (!existing) return;
  if (!canTransitionLeadStatus(existing.status, status)) return;

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: leadId },
      data: {
        status,
        convertedAt: status === "WON" ? (existing.convertedAt ?? now) : null,
      },
    });
    const implied = STATUS_MILESTONE[status];
    if (implied) await ensureMilestone(tx, leadId, implied, now);
  });

  revalidateCommercial(leadId);
}

export async function deleteLeadAction(leadId: string): Promise<void> {
  await requireUser();
  await prisma.$transaction(async (tx) => {
    await tx.reminder.deleteMany({
      where: {
        relatedType: FOLLOWUP_RELATED_TYPE,
        relatedId: {
          in: (
            await tx.followUp.findMany({ where: { leadId }, select: { id: true } })
          ).map((f) => f.id),
        },
      },
    });
    await tx.lead.delete({ where: { id: leadId } });
  });
  revalidateCommercial(leadId);
}

// ---------------------------------------------------------------------------
// Communication milestones & interactions
// ---------------------------------------------------------------------------

export async function achieveMilestoneAction(
  _prev: CommercialFormState,
  formData: FormData,
): Promise<CommercialFormState> {
  await requireUser();
  const parsed = milestoneCreateSchema.safeParse({
    leadId: formData.get("leadId"),
    stage: formData.get("stage"),
    notes: formData.get("notes") ?? "",
    reachedAt: formData.get("reachedAt") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };

  const reached =
    dateTimeOrNull(parsed.data.reachedAt) ??
    dateOnlyOrNull(parsed.data.reachedAt) ??
    zonedNow();

  await prisma.communicationMilestone.upsert({
    where: {
      leadId_stage: {
        leadId: parsed.data.leadId,
        stage: parsed.data.stage,
      },
    },
    create: {
      leadId: parsed.data.leadId,
      stage: parsed.data.stage,
      notes: textOrNull(parsed.data.notes),
      reachedAt: reached,
    },
    update: {
      notes: textOrNull(parsed.data.notes) ?? undefined,
      reachedAt: reached,
    },
  });

  revalidateCommercial(parsed.data.leadId);
  return { success: "Milestone recorded." };
}

export async function deleteMilestoneAction(milestoneId: string): Promise<void> {
  await requireUser();
  const milestone = await prisma.communicationMilestone.delete({
    where: { id: milestoneId },
  });
  revalidateCommercial(milestone.leadId);
}

export async function recordInteractionAction(
  _prev: CommercialFormState,
  formData: FormData,
): Promise<CommercialFormState> {
  await requireUser();
  const leadId = String(formData.get("leadId") ?? "");
  const type = String(formData.get("type") ?? "NOTE") as ContactType;
  const summary = String(formData.get("summary") ?? "").trim();
  if (!leadId) return { error: "Lead is required." };
  if (!summary) return { error: "Summary is required." };

  const occurredAt =
    dateTimeOrNull(String(formData.get("occurredAt") ?? "")) ?? new Date();

  await prisma.$transaction(async (tx) => {
    await tx.interaction.create({
      data: {
        leadId,
        type,
        summary,
        notes: textOrNull(String(formData.get("notes") ?? "")),
        occurredAt,
      },
    });
    await tx.lead.update({
      where: { id: leadId },
      data: { lastContactedAt: occurredAt },
    });
  });

  revalidateCommercial(leadId);
  return { success: "Interaction logged." };
}

// ---------------------------------------------------------------------------
// Follow-ups (each scheduled follow-up owns exactly one linked reminder)
// ---------------------------------------------------------------------------

export async function createFollowUpAction(
  _prev: CommercialFormState,
  formData: FormData,
): Promise<CommercialFormState> {
  await requireUser();
  const parsed = followUpCreateSchema.safeParse({
    leadId: formData.get("leadId"),
    dueAt: formData.get("dueAt"),
    channel: formData.get("channel") ?? "CALL",
    purpose: formData.get("purpose") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  const d = parsed.data;

  const lead = await prisma.lead.findUnique({
    where: { id: d.leadId },
    select: { id: true, name: true },
  });
  if (!lead) return { error: "Lead not found." };

  const dueAt = fromZonedTime(d.dueAt, APP_TIMEZONE);

  await prisma.$transaction(async (tx) => {
    const followUp = await tx.followUp.create({
      data: {
        leadId: d.leadId,
        dueAt,
        channel: d.channel,
        purpose: textOrNull(d.purpose),
        notes: textOrNull(d.notes),
      },
    });
    await tx.reminder.create({
      data: {
        type: "SALES_FOLLOWUP",
        title: `Follow up: ${lead.name}`,
        description: textOrNull(d.purpose),
        dueAt,
        channel: "IN_APP",
        relatedType: FOLLOWUP_RELATED_TYPE,
        relatedId: followUp.id,
      },
    });
    await recomputeNextFollowUp(tx, d.leadId);
  });

  revalidateCommercial(d.leadId);
  revalidatePath("/reminders");
  return { success: "Follow-up scheduled." };
}

export async function rescheduleFollowUpAction(
  _prev: CommercialFormState,
  formData: FormData,
): Promise<CommercialFormState> {
  await requireUser();
  const parsed = followUpRescheduleSchema.safeParse({
    followUpId: formData.get("followUpId"),
    dueAt: formData.get("dueAt"),
    reason: formData.get("reason") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  const d = parsed.data;

  const existing = await prisma.followUp.findUnique({
    where: { id: d.followUpId },
    select: { id: true, leadId: true, dueAt: true, status: true },
  });
  if (!existing) return { error: "Follow-up not found." };
  if (existing.status !== "SCHEDULED") {
    return { error: "Only scheduled follow-ups can be rescheduled." };
  }

  const dueAt = fromZonedTime(d.dueAt, APP_TIMEZONE);

  await prisma.$transaction(async (tx) => {
    await tx.followUp.update({
      where: { id: d.followUpId },
      data: { dueAt },
    });
    await tx.followUpReschedule.create({
      data: {
        followUpId: d.followUpId,
        fromDueAt: existing.dueAt,
        toDueAt: dueAt,
        reason: textOrNull(d.reason),
      },
    });
    await tx.reminder.updateMany({
      where: { relatedType: FOLLOWUP_RELATED_TYPE, relatedId: d.followUpId },
      data: { dueAt, status: "PENDING", dismissedAt: null },
    });
    await recomputeNextFollowUp(tx, existing.leadId);
  });

  revalidateCommercial(existing.leadId);
  revalidatePath("/reminders");
  return { success: "Follow-up rescheduled." };
}

export async function completeFollowUpAction(
  _prev: CommercialFormState,
  formData: FormData,
): Promise<CommercialFormState> {
  await requireUser();
  const parsed = followUpCompleteSchema.safeParse({
    followUpId: formData.get("followUpId"),
    outcome: formData.get("outcome") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };

  const existing = await prisma.followUp.findUnique({
    where: { id: parsed.data.followUpId },
    select: { id: true, leadId: true, channel: true, purpose: true, status: true },
  });
  if (!existing) return { error: "Follow-up not found." };
  if (existing.status !== "SCHEDULED") {
    return { error: "This follow-up is already closed." };
  }

  const now = new Date();
  const outcome = textOrNull(parsed.data.outcome);

  await prisma.$transaction(async (tx) => {
    await tx.followUp.update({
      where: { id: existing.id },
      data: { status: "COMPLETED", completedAt: now, outcome },
    });
    await tx.reminder.updateMany({
      where: { relatedType: FOLLOWUP_RELATED_TYPE, relatedId: existing.id },
      data: { status: "COMPLETED", completedAt: now },
    });
    await tx.interaction.create({
      data: {
        leadId: existing.leadId,
        type: existing.channel,
        summary: existing.purpose ?? "Follow-up completed",
        notes: outcome,
        occurredAt: now,
      },
    });
    await tx.lead.update({
      where: { id: existing.leadId },
      data: { lastContactedAt: now },
    });
    await recomputeNextFollowUp(tx, existing.leadId);
  });

  revalidateCommercial(existing.leadId);
  revalidatePath("/reminders");
  return { success: "Follow-up completed." };
}

export async function cancelFollowUpAction(followUpId: string): Promise<void> {
  await requireUser();
  const existing = await prisma.followUp.findUnique({
    where: { id: followUpId },
    select: { id: true, leadId: true, status: true },
  });
  if (!existing || existing.status !== "SCHEDULED") return;

  await prisma.$transaction(async (tx) => {
    await tx.followUp.update({
      where: { id: followUpId },
      data: { status: "CANCELLED" },
    });
    await tx.reminder.updateMany({
      where: { relatedType: FOLLOWUP_RELATED_TYPE, relatedId: followUpId },
      data: { status: "DISMISSED", dismissedAt: new Date() },
    });
    await recomputeNextFollowUp(tx, existing.leadId);
  });

  revalidateCommercial(existing.leadId);
  revalidatePath("/reminders");
}

// ---------------------------------------------------------------------------
// Conversion to client (and optional project)
// ---------------------------------------------------------------------------

export async function convertLeadToClientAction(
  _prev: CommercialFormState,
  formData: FormData,
): Promise<CommercialFormState> {
  await requireUser();
  const parsed = convertLeadSchema.safeParse({
    leadId: formData.get("leadId"),
    clientName: formData.get("clientName"),
    createProject: formData.get("createProject") === "on" ||
      formData.get("createProject") === "true",
    projectName: formData.get("projectName") ?? "",
    projectBudget: formData.get("projectBudget") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  const d = parsed.data;

  const lead = await prisma.lead.findUnique({
    where: { id: d.leadId },
    include: { client: { select: { id: true } } },
  });
  if (!lead) return { error: "Lead not found." };
  if (
    !isLeadConvertible({ status: lead.status, hasClient: Boolean(lead.client) })
  ) {
    return {
      error: lead.client
        ? "This lead has already been converted to a client."
        : "Only won leads can be converted to a client.",
    };
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: d.leadId },
      data: { status: "WON", convertedAt: lead.convertedAt ?? now },
    });

    const client = await tx.client.create({
      data: {
        name: d.clientName,
        company: lead.company,
        email: lead.email,
        phone: lead.phone,
        area: lead.area,
        address: lead.address,
        notes: lead.notes,
        convertedAt: now,
        leadId: lead.id,
      },
    });

    if (d.createProject) {
      await tx.project.create({
        data: {
          name:
            textOrNull(d.projectName) ??
            `${lead.company ?? lead.name} project`,
          status: "PLANNED",
          budget: moneyOrNull(d.projectBudget) ?? undefined,
          agreedPrice: moneyOrNull(d.projectBudget) ?? undefined,
          clientId: client.id,
          leadId: lead.id,
        },
      });
    }

    await ensureMilestone(tx, lead.id, "CONTRACT", now);
    await tx.interaction.create({
      data: {
        clientId: client.id,
        leadId: lead.id,
        type: "NOTE",
        summary: "Lead converted to client",
        notes: `Converted from lead "${lead.name}".`,
        occurredAt: now,
      },
    });
  });

  revalidateCommercial(lead.id);
  revalidatePath("/projects");
  return { success: "Lead converted to client." };
}
