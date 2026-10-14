"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { zonedDateOnly, zonedNow } from "@/lib/datetime";
import {
  taskCarryForwardSchema,
  taskCreateSchema,
  taskRescheduleSchema,
  taskStatusSchema,
  taskUpdateSchema,
} from "@/lib/validation";
import { carryForwardCandidates, type TaskLike } from "@/lib/daily-work";
import type { TaskStatus } from "@prisma/client";

export type TaskFormState = { error?: string; success?: string } | null;

function firstError(issues: { message: string }[]): string {
  return issues[0]?.message ?? "Invalid input";
}

function textOrNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function intOrNull(value: string | number | undefined): number | null {
  if (value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function dateOnlyOrNull(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return zonedDateOnly(value);
}

function revalidateTasks(): void {
  revalidatePath("/tasks");
  revalidatePath("/daily-work");
  revalidatePath("/performance");
  revalidatePath("/dashboard");
  revalidatePath("/reminders");
}

function readForm(formData: FormData) {
  return {
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    status: formData.get("status") ?? "TODO",
    priority: formData.get("priority") ?? "MEDIUM",
    isRequired: formData.get("isRequired") === "on" || formData.get("isRequired") === "true",
    estimateMinutes: formData.get("estimateMinutes") ?? "",
    dueDate: formData.get("dueDate") ?? "",
    projectId: formData.get("projectId") ?? "",
    weekPlanId: formData.get("weekPlanId") ?? "",
  };
}

export async function createTaskAction(
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  await requireUser();
  const parsed = taskCreateSchema.safeParse(readForm(formData));
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  const d = parsed.data;

  await prisma.task.create({
    data: {
      title: d.title,
      description: textOrNull(d.description),
      status: d.status,
      priority: d.priority,
      isRequired: Boolean(d.isRequired),
      estimateMinutes: intOrNull(d.estimateMinutes),
      dueDate: dateOnlyOrNull(d.dueDate),
      projectId: textOrNull(d.projectId),
      weekPlanId: textOrNull(d.weekPlanId),
    },
  });

  revalidateTasks();
  return { success: `Task "${d.title}" created.` };
}

export async function updateTaskAction(
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  await requireUser();
  const parsed = taskUpdateSchema.safeParse({
    id: formData.get("id"),
    ...readForm(formData),
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  const d = parsed.data;

  await prisma.task.update({
    where: { id: d.id },
    data: {
      title: d.title,
      description: textOrNull(d.description),
      status: d.status,
      priority: d.priority,
      isRequired: Boolean(d.isRequired),
      estimateMinutes: intOrNull(d.estimateMinutes),
      dueDate: dateOnlyOrNull(d.dueDate),
      projectId: textOrNull(d.projectId),
      weekPlanId: textOrNull(d.weekPlanId),
      completedAt: d.status === "DONE" ? zonedNow() : null,
    },
  });

  revalidateTasks();
  return { success: "Task updated." };
}

export async function setTaskStatusAction(
  id: string,
  status: TaskStatus,
): Promise<void> {
  await requireUser();
  const parsed = taskStatusSchema.safeParse({ id, status });
  if (!parsed.success) return;

  await prisma.task.update({
    where: { id },
    data: {
      status,
      completedAt: status === "DONE" ? zonedNow() : null,
    },
  });
  revalidateTasks();
}

/** Reschedule a task to a new due date without losing the record. */
export async function rescheduleTaskAction(
  id: string,
  newDueDate: string,
): Promise<void> {
  await requireUser();
  const parsed = taskRescheduleSchema.safeParse({ id, dueDate: newDueDate });
  if (!parsed.success) return;

  await prisma.task.update({
    where: { id },
    data: { dueDate: zonedDateOnly(parsed.data.dueDate) },
  });
  revalidateTasks();
}

export async function deleteTaskAction(id: string): Promise<void> {
  await requireUser();
  await prisma.task.delete({ where: { id } });
  revalidateTasks();
}

/**
 * Carry unfinished tasks into another week. Unfinished tasks are cloned with a
 * `carriedFromId` link so the original record — and its history — is retained.
 */
export async function carryForwardTasksAction(
  fromWeekPlanId: string | null,
  toWeekPlanId: string,
): Promise<void> {
  await requireUser();
  const parsed = taskCarryForwardSchema.safeParse({
    fromWeekPlanId: fromWeekPlanId ?? "",
    toWeekPlanId,
  });
  if (!parsed.success) return;

  const from = textOrNull(parsed.data.fromWeekPlanId);
  const tasks = await prisma.task.findMany({
    where: from ? { weekPlanId: from } : { weekPlanId: null },
  });

  const candidates = carryForwardCandidates(
    tasks.map((t) => ({
      ...t,
      status: t.status,
      priority: t.priority,
    })) as (TaskLike & { id: string })[],
    zonedNow(),
  );

  if (candidates.length === 0) {
    revalidateTasks();
    return;
  }

  await prisma.$transaction(
    candidates.map((task) =>
      prisma.task.create({
        data: {
          title: task.title ?? "Untitled task",
          description: textOrNull((task as { description?: string | null }).description),
          status: "TODO",
          priority: task.priority,
          isRequired: Boolean(task.isRequired),
          estimateMinutes:
            (task as { estimateMinutes?: number | null }).estimateMinutes ?? null,
          dueDate: task.dueDate ? new Date(task.dueDate) : null,
          projectId: (task as { projectId?: string | null }).projectId ?? null,
          weekPlanId: toWeekPlanId,
          carriedFromId: task.id ?? null,
        },
      }),
    ),
  );

  revalidateTasks();
}

/** Carry a single task forward into a target week. */
export async function carryForwardTaskAction(
  taskId: string,
  toWeekPlanId: string,
): Promise<void> {
  await requireUser();
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return;

  await prisma.task.create({
    data: {
      title: task.title,
      description: task.description,
      status: "TODO",
      priority: task.priority,
      isRequired: task.isRequired,
      estimateMinutes: task.estimateMinutes,
      dueDate: task.dueDate,
      projectId: task.projectId,
      weekPlanId: toWeekPlanId,
      carriedFromId: task.id,
    },
  });

  revalidateTasks();
}
