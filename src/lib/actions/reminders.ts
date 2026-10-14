"use server";

import { revalidatePath } from "next/cache";
import { fromZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { reminderCreateSchema } from "@/lib/validation";
import { APP_TIMEZONE } from "@/lib/constants";
import { zonedNow } from "@/lib/datetime";
import { generateReminders } from "@/lib/reminder-engine";
import type { ReminderStatus } from "@prisma/client";

export type ReminderFormState = { error?: string; success?: string } | null;

const VALID_STATUSES: ReminderStatus[] = [
  "PENDING",
  "COMPLETED",
  "OVERDUE",
  "DISMISSED",
];

export async function createReminderAction(
  _prev: ReminderFormState,
  formData: FormData,
): Promise<ReminderFormState> {
  await requireUser();

  const parsed = reminderCreateSchema.safeParse({
    type: formData.get("type"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    dueAt: formData.get("dueAt"),
    channel: formData.get("channel") ?? "IN_APP",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.reminder.create({
    data: {
      type: parsed.data.type,
      title: parsed.data.title,
      description: parsed.data.description || null,
      dueAt: fromZonedTime(parsed.data.dueAt, APP_TIMEZONE),
      channel: parsed.data.channel,
    },
  });

  revalidatePath("/reminders");
  revalidatePath("/dashboard");
  return { success: "Reminder created." };
}

/**
 * Update only the reminder's status.
 * Dismissing a reminder never marks an underlying task or report as complete.
 */
export async function updateReminderStatusAction(
  reminderId: string,
  status: ReminderStatus,
): Promise<void> {
  await requireUser();
  if (!VALID_STATUSES.includes(status)) return;

  await prisma.reminder.update({
    where: { id: reminderId },
    data: {
      status,
      completedAt: status === "COMPLETED" ? new Date() : null,
      dismissedAt: status === "DISMISSED" ? new Date() : null,
    },
  });

  revalidatePath("/reminders");
  revalidatePath("/dashboard");
}

export async function deleteReminderAction(reminderId: string): Promise<void> {
  await requireUser();
  await prisma.reminder.delete({ where: { id: reminderId } });
  revalidatePath("/reminders");
  revalidatePath("/dashboard");
}

/**
 * Scan recorded data and raise advisory reminders for incomplete sessions,
 * overdue tasks, upcoming Saturday planning, missing weekly reports and monthly
 * finance reviews, then resolve any that are no longer needed.
 * Idempotent: reminders already raised for a record are never duplicated.
 * Dismissing or completing a reminder never completes the underlying item.
 */
export async function generateRemindersAction(): Promise<void> {
  await requireUser();
  await generateReminders(zonedNow());
  revalidatePath("/reminders");
  revalidatePath("/dashboard");
}
