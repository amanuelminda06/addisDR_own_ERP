import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { toNumber } from "./utils";
import { summarizeCommercialWindow } from "./commercial";
import { summarizeFinance } from "./finance";
import { financeEntrySelect } from "./finance-queries";
import {
  summarizeSessions,
  summarizeTasks,
  type ReportMetrics,
} from "./daily-work";

/**
 * Assemble the auto-populated weekly report metrics from the modules that own
 * the data: Commercial (leads), Finance (entries), Daily Work (sessions) and
 * Tasks. Nothing is fabricated — absent data simply reads as zero.
 */
export async function buildReportMetrics(plan: {
  id: string;
  weekStart: Date;
  weekEnd: Date;
}): Promise<ReportMetrics> {
  const range = { from: plan.weekStart, to: plan.weekEnd };

  const [leads, entries, sessions, tasks] = await Promise.all([
    prisma.lead.findMany({
      select: {
        status: true,
        estimatedValue: true,
        createdAt: true,
        convertedAt: true,
        updatedAt: true,
      },
    }),
    prisma.financeEntry.findMany({
      where: { occurredAt: { gte: plan.weekStart, lt: plan.weekEnd } },
      select: financeEntrySelect,
    }),
    prisma.workSession.findMany({
      where: { date: { gte: plan.weekStart, lt: plan.weekEnd } },
      select: {
        date: true,
        sessionNumber: true,
        plannedMinutes: true,
        actualMinutes: true,
        status: true,
      },
    }),
    prisma.task.findMany({
      where: {
        OR: [
          { weekPlanId: plan.id },
          { completedAt: { gte: plan.weekStart, lt: plan.weekEnd } },
        ],
      },
      select: { status: true, priority: true, isRequired: true, dueDate: true },
    }),
  ]);

  const commercial = summarizeCommercialWindow(
    leads.map((l) => ({
      status: l.status,
      estimatedValue: toNumber(l.estimatedValue),
      createdAt: l.createdAt,
      convertedAt: l.convertedAt,
      updatedAt: l.updatedAt,
    })),
    range,
  );
  const finance = summarizeFinance(entries);
  const dailyWork = summarizeSessions(sessions);
  const taskSummary = summarizeTasks(tasks);

  return {
    commercial: {
      leadsCreated: commercial.created,
      dealsWon: commercial.won,
      wonValue: commercial.wonValue,
    },
    finance: {
      receivedIncome: finance.receivedIncome,
      businessExpenses: finance.businessExpenses,
      netProfit: finance.netProfit,
    },
    dailyWork: {
      plannedSessions: dailyWork.planned,
      completedSessions: dailyWork.completed,
      completedHours: dailyWork.actualHours,
      sessionCompletionRate: dailyWork.completionRate,
    },
    tasks: {
      total: taskSummary.total,
      done: taskSummary.done,
      completionRate: taskSummary.completionRate,
    },
  };
}

export type WeekPlanWithReport = Prisma.WeekPlanGetPayload<{
  include: { report: true };
}>;

/** Recent weekly plans with their report, newest first. */
export async function recentWeekPlans(take = 12): Promise<WeekPlanWithReport[]> {
  return prisma.weekPlan.findMany({
    orderBy: { weekStart: "desc" },
    take,
    include: { report: true },
  });
}
