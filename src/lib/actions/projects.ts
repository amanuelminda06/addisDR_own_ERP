"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import type { PaymentMethod } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { zonedDateOnly } from "@/lib/datetime";
import {
  collectionScheduleSchema,
  projectAgreedPriceSchema,
  projectPaymentSchema,
} from "@/lib/validation";
import { financeEntrySignature } from "@/lib/finance";

export type ProjectFormState = { error?: string; success?: string } | null;

const PAYMENT_ENTITY = "ProjectPayment";
const SCHEDULE_ENTITY = "CollectionSchedule";
const PROJECT_ENTITY = "Project";

function firstError(issues: { message: string }[]): string {
  return issues[0]?.message ?? "Invalid input";
}

function textOrNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function paymentMethodOrNull(value: string | undefined | null): PaymentMethod | null {
  const v = textOrNull(value);
  return (v as PaymentMethod | null) ?? null;
}

function dateOnly(value: string): Date {
  return zonedDateOnly(value);
}

async function writeAudit(
  tx: Prisma.TransactionClient,
  input: {
    entityType: string;
    entityId: string;
    action: "CREATE" | "UPDATE" | "DELETE";
    summary: string;
    changes?: Prisma.InputJsonValue | null;
    actorEmail?: string | null;
  },
): Promise<void> {
  await tx.auditLog.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      summary: input.summary,
      changes: input.changes ?? undefined,
      actorEmail: input.actorEmail ?? null,
    },
  });
}

function revalidateProject(projectId?: string | null): void {
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath("/finance");
  revalidatePath("/finance/reports");
  revalidatePath("/reminders");
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

// ---------------------------------------------------------------------------
// Agreed price
// ---------------------------------------------------------------------------

export async function updateProjectAgreedPriceAction(
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const user = await requireUser();
  const parsed = projectAgreedPriceSchema.safeParse({
    id: formData.get("id") ?? "",
    agreedPrice: formData.get("agreedPrice") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  const d = parsed.data;

  const project = await prisma.project.findUnique({ where: { id: d.id } });
  if (!project) return { error: "Project not found." };

  const agreedPrice =
    d.agreedPrice === undefined || d.agreedPrice === ""
      ? project.agreedPrice ?? project.budget
      : typeof d.agreedPrice === "string"
        ? Number(d.agreedPrice)
        : d.agreedPrice;

  await prisma.$transaction(async (tx) => {
    await tx.project.update({
      where: { id: d.id },
      data: { agreedPrice },
    });
    await writeAudit(tx, {
      entityType: PROJECT_ENTITY,
      entityId: d.id,
      action: "UPDATE",
      summary: `Updated agreed price`,
      changes: {
        agreedPrice: {
          from: project.agreedPrice?.toString() ?? null,
          to: String(agreedPrice),
        },
      },
      actorEmail: user.email,
    });
  });

  revalidateProject(d.id);
  return { success: "Agreed price updated." };
}

// ---------------------------------------------------------------------------
// Partial payments
// ---------------------------------------------------------------------------

export async function createProjectPaymentAction(
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const user = await requireUser();
  const parsed = projectPaymentSchema.safeParse({
    projectId: formData.get("projectId") ?? "",
    amount: formData.get("amount") ?? "",
    receivedAt: formData.get("receivedAt") ?? "",
    paymentMethod: formData.get("paymentMethod") ?? "",
    reference: formData.get("reference") ?? "",
    notes: formData.get("notes") ?? "",
    createFinanceEntry: formData.get("createFinanceEntry") ?? "true",
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  const d = parsed.data;

  const project = await prisma.project.findUnique({ where: { id: d.projectId } });
  if (!project) return { error: "Project not found." };

  const receivedAt = dateOnly(d.receivedAt);
  const dedupeHash = d.createFinanceEntry
    ? financeEntrySignature({
        type: "INCOME",
        amount: d.amount,
        occurredAt: receivedAt,
        reference: d.reference,
      })
    : null;

  if (dedupeHash) {
    const duplicate = await prisma.financeEntry.findUnique({ where: { dedupeHash } });
    if (duplicate) {
      return { error: "A matching entry already exists (same reference, date and amount)." };
    }
  }

  const milestoneId = textOrNull(formData.get("milestoneId") as string | null);

  await prisma.$transaction(async (tx) => {
    let financeEntryId: string | null = null;
    if (d.createFinanceEntry) {
      const entry = await tx.financeEntry.create({
        data: {
          type: "INCOME",
          category: "Project payment",
          amount: d.amount,
          currency: "ETB",
          occurredAt: receivedAt,
          paymentStatus: "RECEIVED",
          amountReceived: d.amount,
          paymentMethod: paymentMethodOrNull(d.paymentMethod),
          projectId: d.projectId,
          reference: textOrNull(d.reference),
          description: textOrNull(d.notes),
          notes: textOrNull(d.notes),
          dedupeHash,
        },
      });
      financeEntryId = entry.id;
    }

    const payment = await tx.projectPayment.create({
      data: {
        projectId: d.projectId,
        amount: d.amount,
        currency: "ETB",
        receivedAt,
        paymentMethod: paymentMethodOrNull(d.paymentMethod),
        reference: textOrNull(d.reference),
        notes: textOrNull(d.notes),
        financeEntryId,
      },
    });

    if (milestoneId) {
      const milestone = await tx.collectionSchedule.findUnique({
        where: { id: milestoneId },
      });
      if (milestone && milestone.projectId === d.projectId) {
        await tx.collectionSchedule.update({
          where: { id: milestoneId },
          data: {
            receivedAmount: d.amount,
            status: "RECEIVED",
            paymentId: payment.id,
          },
        });
      }
    }

    await writeAudit(tx, {
      entityType: PAYMENT_ENTITY,
      entityId: payment.id,
      action: "CREATE",
      summary: `Recorded project payment ${d.amount.toFixed(2)} ETB`,
      changes: {
        projectId: d.projectId,
        amount: d.amount,
        receivedAt: receivedAt.toISOString(),
        financeEntryId,
      },
      actorEmail: user.email,
    });
  });

  revalidateProject(d.projectId);
  return { success: "Payment recorded." };
}

export async function deleteProjectPaymentAction(
  formData: FormData,
): Promise<void> {
  await requireUser();
  const id = textOrNull(formData.get("id") as string | null);
  if (!id) return;

  const payment = await prisma.projectPayment.findUnique({ where: { id } });
  if (!payment) return;

  await prisma.$transaction(async (tx) => {
    if (payment.financeEntryId) {
      await tx.financeEntry.delete({ where: { id: payment.financeEntryId } }).catch(() => undefined);
    }
    await tx.collectionSchedule.updateMany({
      where: { paymentId: id },
      data: { paymentId: null, receivedAmount: 0, status: "PENDING" },
    });
    await tx.projectPayment.delete({ where: { id } });
    await writeAudit(tx, {
      entityType: PAYMENT_ENTITY,
      entityId: id,
      action: "DELETE",
      summary: `Deleted project payment ${payment.amount.toString()} ETB`,
      actorEmail: null,
    });
  });

  revalidateProject(payment.projectId);
}

// ---------------------------------------------------------------------------
// Collection schedules (installments / expected payments)
// ---------------------------------------------------------------------------

export async function createCollectionScheduleAction(
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const user = await requireUser();
  const parsed = collectionScheduleSchema.safeParse({
    projectId: formData.get("projectId") ?? "",
    label: formData.get("label") ?? "",
    expectedAmount: formData.get("expectedAmount") ?? "",
    expectedDate: formData.get("expectedDate") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  const d = parsed.data;

  const project = await prisma.project.findUnique({ where: { id: d.projectId } });
  if (!project) return { error: "Project not found." };

  await prisma.$transaction(async (tx) => {
    const schedule = await tx.collectionSchedule.create({
      data: {
        projectId: d.projectId,
        label: d.label,
        expectedAmount: d.expectedAmount,
        expectedDate: dateOnly(d.expectedDate),
        status: "PENDING",
        receivedAmount: 0,
        notes: textOrNull(d.notes),
      },
    });
    await writeAudit(tx, {
      entityType: SCHEDULE_ENTITY,
      entityId: schedule.id,
      action: "CREATE",
      summary: `Added expected payment ${d.label}`,
      changes: {
        projectId: d.projectId,
        expectedAmount: d.expectedAmount,
        expectedDate: dateOnly(d.expectedDate).toISOString(),
      },
      actorEmail: user.email,
    });
  });

  revalidateProject(d.projectId);
  return { success: "Expected payment added." };
}

const scheduleUpdateSchema = z.object({
  id: z.string().min(1),
  expectedDate: z.string().optional().or(z.literal("")),
  expectedAmount: z.coerce.number().nonnegative().optional(),
  label: z.string().trim().optional(),
  notes: z.string().optional(),
  status: z.enum(["PENDING", "PARTIAL", "RECEIVED", "OVERDUE", "CANCELLED"]).optional(),
});

export async function updateCollectionScheduleAction(
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const user = await requireUser();
  const parsed = scheduleUpdateSchema.safeParse({
    id: formData.get("id") ?? "",
    expectedDate: formData.get("expectedDate") ?? "",
    expectedAmount: formData.get("expectedAmount") ?? "",
    label: formData.get("label") ?? "",
    notes: formData.get("notes") ?? "",
    status: formData.get("status") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  const d = parsed.data;

  const existing = await prisma.collectionSchedule.findUnique({ where: { id: d.id } });
  if (!existing) return { error: "Expected payment not found." };

  const data: Prisma.CollectionScheduleUpdateInput = {};
  if (d.label !== undefined && d.label.trim().length > 0) data.label = d.label.trim();
  if (d.expectedDate) data.expectedDate = dateOnly(d.expectedDate);
  if (d.expectedAmount !== undefined) data.expectedAmount = d.expectedAmount;
  if (d.notes !== undefined) data.notes = textOrNull(d.notes);
  if (d.status) data.status = d.status;

  await prisma.$transaction(async (tx) => {
    await tx.collectionSchedule.update({ where: { id: d.id }, data });
    await writeAudit(tx, {
      entityType: SCHEDULE_ENTITY,
      entityId: d.id,
      action: "UPDATE",
      summary: `Updated expected payment ${existing.label}`,
      changes: {
        expectedDate: {
          from: existing.expectedDate.toISOString(),
          to: (data.expectedDate as Date | undefined)?.toISOString() ?? existing.expectedDate.toISOString(),
        },
      },
      actorEmail: user.email,
    });
  });

  revalidateProject(existing.projectId);
  return { success: "Expected payment updated." };
}

export async function deleteCollectionScheduleAction(
  formData: FormData,
): Promise<void> {
  await requireUser();
  const id = textOrNull(formData.get("id") as string | null);
  if (!id) return;

  const schedule = await prisma.collectionSchedule.findUnique({ where: { id } });
  if (!schedule) return;

  await prisma.$transaction(async (tx) => {
    await tx.collectionSchedule.delete({ where: { id } });
    await writeAudit(tx, {
      entityType: SCHEDULE_ENTITY,
      entityId: id,
      action: "DELETE",
      summary: `Deleted expected payment ${schedule.label}`,
      actorEmail: null,
    });
  });

  revalidateProject(schedule.projectId);
}

export async function updateProjectAgreedPriceFormAction(formData: FormData): Promise<void> {
  await updateProjectAgreedPriceAction(null, formData);
}
