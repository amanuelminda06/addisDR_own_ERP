"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { addDays, zonedNow } from "@/lib/datetime";
import { weeklyReportSaveSchema } from "@/lib/validation";

export type WeeklyReportFormState = { error?: string; success?: string } | null;

function firstError(issues: { message: string }[]): string {
  return issues[0]?.message ?? "Invalid input";
}

function textOrNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function revalidateReports(): void {
  revalidatePath("/weekly-reports");
  revalidatePath("/tasks");
  revalidatePath("/performance");
  revalidatePath("/dashboard");
  revalidatePath("/reminders");
}

/**
 * Make sure a draft report row exists for a weekly plan so the editor always
 * has somewhere to save. Idempotent.
 */
export async function ensureWeeklyReportAction(weekPlanId: string): Promise<void> {
  await requireUser();
  const plan = await prisma.weekPlan.findUnique({
    where: { id: weekPlanId },
    include: { report: true },
  });
  if (!plan || plan.report) return;

  await prisma.weeklyReport.create({
    data: { weekPlanId: plan.id, status: "DRAFT" },
  });
  revalidateReports();
}

/** Save (draft) a weekly report. Maps the six-section format onto the model. */
export async function saveWeeklyReportAction(
  _prev: WeeklyReportFormState,
  formData: FormData,
): Promise<WeeklyReportFormState> {
  const user = await requireUser();
  const parsed = weeklyReportSaveSchema.safeParse({
    weekPlanId: formData.get("weekPlanId"),
    summary: formData.get("summary") ?? "",
    challenges: formData.get("challenges") ?? "",
    highlights: formData.get("highlights") ?? "",
    nextWeekGoals: formData.get("nextWeekGoals") ?? "",
    needHelpWith: formData.get("needHelpWith") ?? "",
    recipientName: formData.get("recipientName") ?? "",
    recipientEmail: formData.get("recipientEmail") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  const d = parsed.data;

  const recipientName =
    textOrNull(d.recipientName) ?? user.accountabilityPartnerName ?? null;
  const recipientEmail =
    textOrNull(d.recipientEmail) ?? user.accountabilityPartnerEmail ?? null;

  await prisma.weeklyReport.upsert({
    where: { weekPlanId: d.weekPlanId },
    create: {
      weekPlanId: d.weekPlanId,
      status: "DRAFT",
      summary: textOrNull(d.summary),
      challenges: textOrNull(d.challenges),
      highlights: textOrNull(d.highlights),
      planVariance: textOrNull(d.nextWeekGoals),
      content: textOrNull(d.needHelpWith),
      recipientName,
      recipientEmail,
    },
    update: {
      summary: textOrNull(d.summary),
      challenges: textOrNull(d.challenges),
      highlights: textOrNull(d.highlights),
      planVariance: textOrNull(d.nextWeekGoals),
      content: textOrNull(d.needHelpWith),
      recipientName,
      recipientEmail,
    },
  });

  revalidateReports();
  return { success: "Draft saved." };
}

/**
 * Submit a weekly report to the accountability partner. Reports submitted
 * after the reporting Saturday are marked LATE.
 */
export async function submitWeeklyReportAction(
  weekPlanId: string,
): Promise<void> {
  const user = await requireUser();
  const plan = await prisma.weekPlan.findUnique({ where: { id: weekPlanId } });
  if (!plan) return;

  const now = zonedNow();
  const reportingSaturday = addDays(plan.weekStart, 5);
  const late = now.getTime() >= addDays(reportingSaturday, 1).getTime();

  await prisma.weeklyReport.upsert({
    where: { weekPlanId },
    create: {
      weekPlanId,
      status: late ? "LATE" : "SUBMITTED",
      submittedAt: now,
      recipientName: user.accountabilityPartnerName ?? null,
      recipientEmail: user.accountabilityPartnerEmail ?? null,
    },
    update: {
      status: late ? "LATE" : "SUBMITTED",
      submittedAt: now,
      recipientName: user.accountabilityPartnerName ?? null,
      recipientEmail: user.accountabilityPartnerEmail ?? null,
    },
  });

  // The missing-report reminder stays visible until the report is submitted.
  await prisma.reminder.updateMany({
    where: {
      type: "MISSING_REPORT",
      relatedId: weekPlanId,
      status: { in: ["PENDING", "OVERDUE"] },
    },
    data: { status: "COMPLETED", completedAt: now },
  });

  revalidateReports();
}

/** Reopen a submitted report for further editing. */
export async function reopenWeeklyReportAction(
  weekPlanId: string,
): Promise<void> {
  await requireUser();
  await prisma.weeklyReport.update({
    where: { weekPlanId },
    data: { status: "DRAFT", submittedAt: null },
  });

  // Reopen the missing-report reminder so the obligation is visible again.
  await prisma.reminder.updateMany({
    where: {
      type: "MISSING_REPORT",
      relatedId: weekPlanId,
      status: "COMPLETED",
    },
    data: { status: "PENDING", completedAt: null },
  });

  revalidateReports();
}
