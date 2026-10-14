"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { addDays, startOfWeek, zonedDateOnly, zonedNow } from "@/lib/datetime";
import { SESSION_MINUTES, SESSIONS_PER_WORKDAY, WORKDAYS } from "@/lib/constants";
import {
  markLeaveSchema,
  weekPlanStatusSchema,
  weekPlanUpsertSchema,
  workSessionExtraSchema,
  workSessionRescheduleSchema,
  workSessionStatusSchema,
  workSessionUpdateSchema,
} from "@/lib/validation";
import type { WorkSessionStatus } from "@prisma/client";

export type DailyWorkFormState = { error?: string; success?: string } | null;

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

function revalidateDailyWork(): void {
  revalidatePath("/daily-work");
  revalidatePath("/tasks");
  revalidatePath("/performance");
  revalidatePath("/weekly-reports");
  revalidatePath("/reminders");
  revalidatePath("/dashboard");
}

function isWorkday(date: Date): boolean {
  return (WORKDAYS as readonly number[]).includes(date.getUTCDay());
}

/**
 * Create the three planned session slots for a workday when they are missing.
 * Never overwrites an existing session. Returns the created sessions.
 */
export async function ensureSessionsForDate(
  date: Date,
  weekPlanId?: string | null,
): Promise<void> {
  await requireUser();
  const day = zonedDateOnly(date);
  if (!isWorkday(day)) return;

  const existing = await prisma.workSession.findMany({
    where: { date: day },
    select: { sessionNumber: true },
  });
  const have = new Set(existing.map((s) => s.sessionNumber));

  const missing: { sessionNumber: number; plannedMinutes: number; weekPlanId?: string | null }[] = [];
  for (let n = 1; n <= SESSIONS_PER_WORKDAY; n++) {
    if (!have.has(n)) {
      missing.push({ sessionNumber: n, plannedMinutes: SESSION_MINUTES, weekPlanId });
    }
  }
  if (missing.length === 0) return;

  await prisma.workSession.createMany({
    data: missing.map((m) => ({
      date: day,
      sessionNumber: m.sessionNumber,
      plannedMinutes: m.plannedMinutes,
      status: "PLANNED" as WorkSessionStatus,
      weekPlanId: m.weekPlanId ?? null,
    })),
    skipDuplicates: true,
  });
}

/** Server-action wrapper so the page can lazily create a day's slots. */
export async function ensureDaySessionsAction(dateStr: string): Promise<void> {
  await requireUser();
  const parsed = zonedDateOnly(dateStr);
  await ensureSessionsForDate(parsed);
  revalidateDailyWork();
}

function nextFreeSlot(taken: number[], preferred = SESSIONS_PER_WORKDAY + 1): number {
  const set = new Set(taken);
  if (!set.has(preferred)) return preferred;
  let n = 1;
  while (set.has(n)) n++;
  return n;
}

/** Tick a session complete, or reopen it. Completed sessions record actuals. */
export async function toggleSessionCompleteAction(id: string): Promise<void> {
  await requireUser();
  const session = await prisma.workSession.findUnique({ where: { id } });
  if (!session) return;

  if (session.status === "COMPLETED") {
    await prisma.workSession.update({
      where: { id },
      data: { status: "PLANNED", completedAt: null, actualMinutes: null },
    });
  } else {
    await prisma.workSession.update({
      where: { id },
      data: {
        status: "COMPLETED",
        startedAt: session.startedAt ?? zonedNow(),
        completedAt: zonedNow(),
        actualMinutes: session.actualMinutes ?? session.plannedMinutes,
      },
    });
  }
  revalidateDailyWork();
}

export async function setSessionStatusAction(
  id: string,
  status: WorkSessionStatus,
): Promise<void> {
  await requireUser();
  const parsed = workSessionStatusSchema.safeParse({ id, status });
  if (!parsed.success) return;

  await prisma.workSession.update({
    where: { id },
    data: {
      status,
      completedAt: status === "COMPLETED" ? zonedNow() : null,
    },
  });
  revalidateDailyWork();
}

export async function updateSessionAction(
  _prev: DailyWorkFormState,
  formData: FormData,
): Promise<DailyWorkFormState> {
  await requireUser();
  const parsed = workSessionUpdateSchema.safeParse({
    id: formData.get("id"),
    location: formData.get("location") ?? "",
    focus: formData.get("focus") ?? "",
    plannedStart: formData.get("plannedStart") ?? "",
    plannedEnd: formData.get("plannedEnd") ?? "",
    plannedMinutes: formData.get("plannedMinutes") ?? "",
    actualMinutes: formData.get("actualMinutes") ?? "",
    status: formData.get("status") ?? "PLANNED",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  const d = parsed.data;

  await prisma.workSession.update({
    where: { id: d.id },
    data: {
      location: textOrNull(d.location),
      focus: textOrNull(d.focus),
      plannedStart: textOrNull(d.plannedStart),
      plannedEnd: textOrNull(d.plannedEnd),
      plannedMinutes: intOrNull(d.plannedMinutes) ?? SESSION_MINUTES,
      actualMinutes: intOrNull(d.actualMinutes),
      status: d.status,
      completedAt: d.status === "COMPLETED" ? zonedNow() : null,
      notes: textOrNull(d.notes),
    },
  });

  revalidateDailyWork();
  return { success: "Session updated." };
}

/**
 * Move a session to another day. The original is preserved as RESCHEDULED so
 * history is not lost; a fresh PLANNED slot is created on the new day.
 */
export async function rescheduleSessionAction(
  id: string,
  newDateStr: string,
): Promise<void> {
  await requireUser();
  const parsed = workSessionRescheduleSchema.safeParse({ id, newDate: newDateStr });
  if (!parsed.success) return;

  const session = await prisma.workSession.findUnique({ where: { id } });
  if (!session) return;

  const target = zonedDateOnly(parsed.data.newDate);
  const existing = await prisma.workSession.findMany({
    where: { date: target },
    select: { sessionNumber: true },
  });
  const slot = nextFreeSlot(existing.map((s) => s.sessionNumber));

  await prisma.$transaction([
    prisma.workSession.update({
      where: { id },
      data: {
        status: "RESCHEDULED",
        notes: textOrNull(
          `${session.notes ? `${session.notes}\n` : ""}Rescheduled to ${target
            .toISOString()
            .slice(0, 10)}.`,
        ),
      },
    }),
    prisma.workSession.create({
      data: {
        date: target,
        sessionNumber: slot,
        plannedMinutes: session.plannedMinutes,
        location: session.location,
        focus: session.focus,
        weekPlanId: session.weekPlanId,
        status: "PLANNED",
        notes: `Rescheduled from ${session.date.toISOString().slice(0, 10)}.`,
      },
    }),
  ]);

  revalidateDailyWork();
}

/**
 * Add an extra session beyond the planned three — used for advance
 * compensation (working ahead) or emergency catch-up.
 */
export async function addExtraSessionAction(
  _prev: DailyWorkFormState,
  formData: FormData,
): Promise<DailyWorkFormState> {
  await requireUser();
  const parsed = workSessionExtraSchema.safeParse({
    date: formData.get("date"),
    focus: formData.get("focus") ?? "",
    location: formData.get("location") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };

  const day = zonedDateOnly(parsed.data.date);
  const existing = await prisma.workSession.findMany({
    where: { date: day },
    select: { sessionNumber: true },
  });
  const slot = nextFreeSlot(existing.map((s) => s.sessionNumber));

  await prisma.workSession.create({
    data: {
      date: day,
      sessionNumber: slot,
      plannedMinutes: SESSION_MINUTES,
      location: textOrNull(parsed.data.location),
      focus: textOrNull(parsed.data.focus) ?? "Extra session",
      status: "PLANNED",
    },
  });

  revalidateDailyWork();
  return { success: "Extra session added." };
}

/** Planned leave: remove the day's unstarted slots and record the reason. */
export async function markPlannedLeaveAction(
  _prev: DailyWorkFormState,
  formData: FormData,
): Promise<DailyWorkFormState> {
  await requireUser();
  const parsed = markLeaveSchema.safeParse({
    date: formData.get("date"),
    reason: formData.get("reason") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };

  const day = zonedDateOnly(parsed.data.date);
  const removed = await prisma.workSession.deleteMany({
    where: { date: day, status: "PLANNED" },
  });

  revalidateDailyWork();
  return {
    success:
      removed.count > 0
        ? `Planned leave recorded — ${removed.count} session slot${
            removed.count === 1 ? "" : "s"
          } cleared.`
        : "Planned leave recorded. Completed sessions were kept.",
  };
}

/**
 * Generate the whole week's session slots (Mon–Fri) and attach them to the
 * weekly plan. Existing slots are left untouched.
 */
export async function planWeekSessionsAction(weekPlanId: string): Promise<void> {
  await requireUser();
  const plan = await prisma.weekPlan.findUnique({ where: { id: weekPlanId } });
  if (!plan) return;

  const start = startOfWeek(plan.weekStart);
  for (let i = 0; i < 7; i++) {
    const day = addDays(start, i);
    if (!isWorkday(day)) continue;
    await ensureSessionsForDate(day, plan.id);
  }
  revalidateDailyWork();
}

export async function upsertWeekPlanAction(
  _prev: DailyWorkFormState,
  formData: FormData,
): Promise<DailyWorkFormState> {
  await requireUser();
  const parsed = weekPlanUpsertSchema.safeParse({
    id: formData.get("id") ?? "",
    weekStart: formData.get("weekStart"),
    objectives: formData.get("objectives") ?? "",
    commercialTargets: formData.get("commercialTargets") ?? "",
    financialObjectives: formData.get("financialObjectives") ?? "",
    workLocations: formData.get("workLocations") ?? "",
    notes: formData.get("notes") ?? "",
    status: formData.get("status") ?? undefined,
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  const d = parsed.data;

  const weekStart = startOfWeek(zonedDateOnly(d.weekStart));
  const weekEnd = addDays(weekStart, 5); // exclusive — Monday..Friday
  const status = d.status ?? "DRAFT";

  const data = {
    weekStart,
    weekEnd,
    status,
    objectives: textOrNull(d.objectives),
    commercialTargets: textOrNull(d.commercialTargets),
    financialObjectives: textOrNull(d.financialObjectives),
    workLocations: textOrNull(d.workLocations),
    notes: textOrNull(d.notes),
    plannedAt: status === "ACTIVE" ? zonedNow() : null,
  };

  const plan = await prisma.weekPlan.upsert({
    where: { weekStart },
    create: data,
    update: {
      weekEnd: data.weekEnd,
      status: data.status,
      objectives: data.objectives,
      commercialTargets: data.commercialTargets,
      financialObjectives: data.financialObjectives,
      workLocations: data.workLocations,
      notes: data.notes,
      ...(status === "ACTIVE" ? { plannedAt: zonedNow() } : {}),
    },
  });

  if (status === "ACTIVE") {
    await planWeekSessionsAction(plan.id);
  }

  revalidateDailyWork();
  return { success: `Weekly plan for ${weekStart.toISOString().slice(0, 10)} saved.` };
}

export async function setWeekPlanStatusAction(
  id: string,
  status: "DRAFT" | "ACTIVE" | "SUBMITTED" | "ARCHIVED",
): Promise<void> {
  await requireUser();
  const parsed = weekPlanStatusSchema.safeParse({ id, status });
  if (!parsed.success) return;

  await prisma.weekPlan.update({
    where: { id },
    data: {
      status,
      plannedAt: status === "ACTIVE" ? zonedNow() : undefined,
    },
  });

  if (status === "ACTIVE") {
    await planWeekSessionsAction(id);
  }
  revalidateDailyWork();
}

export async function deleteWeekPlanAction(id: string): Promise<void> {
  await requireUser();
  await prisma.weekPlan.delete({ where: { id } });
  revalidateDailyWork();
}
