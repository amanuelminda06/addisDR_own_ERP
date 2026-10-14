import { prisma } from "./prisma";
import { toNumber } from "./utils";
import {
  addDays,
  endOfMonth,
  startOfMonth,
  startOfWeek,
  todayDateOnly,
  zonedNow,
} from "./datetime";
import {
  allowanceStatus,
  computeAllocations,
  effectiveReminderStatus,
  netProfit,
} from "./rules";
import {
  costPerLead,
  isLeadStale,
  summarizePipeline,
} from "./commercial";

export const PERSONAL_CATEGORY = "Personal";

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

export async function getDashboardData() {
  const now = zonedNow();
  const weekStart = startOfWeek(todayDateOnly());
  const weekEnd = addDays(weekStart, 7);
  const monthStart = startOfMonth(todayDateOnly());
  const monthEnd = addDays(endOfMonth(todayDateOnly()), 1);

  const [
    sessionsThisWeek,
    weekPlan,
    openTasks,
    overdueTasks,
    dueThisWeekTasks,
    allLeads,
    followUps,
    activeProjects,
    incomeMonth,
    expenseMonth,
    personalMonth,
    allocationRules,
    upcomingReminders,
    pendingReminders,
    meetings,
    user,
    marketingActivities,
    attributedLeads,
    overdueFollowUps,
  ] = await Promise.all([
    prisma.workSession.findMany({
      where: { date: { gte: weekStart, lt: weekEnd } },
      select: { status: true, plannedMinutes: true, actualMinutes: true },
    }),
    prisma.weekPlan.findUnique({
      where: { weekStart },
      include: { report: true },
    }),
    prisma.task.count({
      where: { status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] } },
    }),
    prisma.task.count({
      where: {
        status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] },
        dueDate: { lt: now },
      },
    }),
    prisma.task.count({
      where: {
        status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] },
        dueDate: { gte: now, lt: weekEnd },
      },
    }),
    prisma.lead.findMany({
      select: {
        status: true,
        estimatedValue: true,
        probability: true,
        lastContactedAt: true,
      },
    }),
    prisma.lead.findMany({
      where: { nextFollowUpAt: { not: null }, status: { notIn: ["WON", "LOST"] } },
      orderBy: { nextFollowUpAt: "asc" },
      take: 5,
      select: {
        id: true,
        name: true,
        company: true,
        nextFollowUpAt: true,
        status: true,
      },
    }),
    prisma.project.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        budget: true,
        financeEntries: {
          where: { type: "INCOME" },
          select: { amount: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.financeEntry.aggregate({
      where: { type: "INCOME", occurredAt: { gte: monthStart, lt: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.financeEntry.aggregate({
      where: { type: "EXPENSE", occurredAt: { gte: monthStart, lt: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.financeEntry.aggregate({
      where: {
        type: "EXPENSE",
        category: PERSONAL_CATEGORY,
        occurredAt: { gte: monthStart, lt: monthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.financialAllocation.findMany({ where: { isActive: true } }),
    prisma.reminder.findMany({
      where: { status: "PENDING", dueAt: { gte: now } },
      orderBy: { dueAt: "asc" },
      take: 5,
    }),
    prisma.reminder.findMany({
      where: { status: { in: ["PENDING", "OVERDUE"] } },
      orderBy: { dueAt: "asc" },
    }),
    prisma.reminder.findMany({
      where: { type: "MEETING", status: "PENDING", dueAt: { gte: now } },
      orderBy: { dueAt: "asc" },
      take: 5,
    }),
    prisma.user.findFirst({ orderBy: { createdAt: "asc" } }),
    prisma.marketingActivity.findMany({
      select: { status: true, budget: true, spend: true },
    }),
    prisma.lead.count({ where: { marketingActivityId: { not: null } } }),
    prisma.followUp.count({
      where: { status: "SCHEDULED", dueAt: { lt: now } },
    }),
  ]);

  // --- Work sessions ---------------------------------------------------------
  const plannedSessions = sessionsThisWeek.length;
  const completedSessions = sessionsThisWeek.filter(
    (s) => s.status === "COMPLETED",
  ).length;
  const plannedHours = sessionsThisWeek.reduce(
    (sum, s) => sum + toNumber(s.plannedMinutes) / 60,
    0,
  );
  const completedHours = sessionsThisWeek.reduce(
    (sum, s) => sum + toNumber(s.actualMinutes) / 60,
    0,
  );
  const missedSessions = sessionsThisWeek.filter(
    (s) => s.status === "MISSED",
  ).length;

  // --- Commercial ------------------------------------------------------------
  const pipeline = summarizePipeline(allLeads);
  const staleLeads = allLeads.filter(
    (l) =>
      l.status !== "WON" &&
      l.status !== "LOST" &&
      isLeadStale(l.lastContactedAt, now),
  ).length;

  // --- Marketing -------------------------------------------------------------
  const marketingSpend = marketingActivities.reduce(
    (sum, a) => sum + toNumber(a.spend),
    0,
  );
  const marketingBudget = marketingActivities.reduce(
    (sum, a) => sum + toNumber(a.budget),
    0,
  );
  const activeActivities = marketingActivities.filter(
    (a) => a.status === "ACTIVE",
  ).length;

  // --- Projects --------------------------------------------------------------
  const projectsWithRevenue = activeProjects.map((p) => ({
    id: p.id,
    name: p.name,
    budget: toNumber(p.budget),
    revenue: p.financeEntries.reduce((sum, e) => sum + toNumber(e.amount), 0),
  }));
  const activeProjectRevenue = projectsWithRevenue.reduce(
    (sum, p) => sum + p.revenue,
    0,
  );

  // --- Finance ---------------------------------------------------------------
  const income = toNumber(incomeMonth._sum.amount);
  const expenses = toNumber(expenseMonth._sum.amount);
  const personalSpent = toNumber(personalMonth._sum.amount);
  const allowanceLimit = toNumber(user?.monthlyAllowance);
  const allowance = allowanceStatus(personalSpent, allowanceLimit);

  const allocations = computeAllocations(
    income,
    allocationRules.map((r) => ({
      category: r.category,
      method: r.method,
      value: toNumber(r.value),
      isActive: r.isActive,
    })),
  );

  // --- Reminders -------------------------------------------------------------
  const nowTime = now.getTime();
  const overdueReminders = pendingReminders.filter(
    (r) => effectiveReminderStatus(r, now) === "OVERDUE",
  );

  return {
    generatedAt: now,
    weekStart,
    weekEnd,
    monthStart,
    monthEnd,
    sessions: {
      planned: plannedSessions,
      completed: completedSessions,
      missed: missedSessions,
      plannedHours,
      completedHours,
    },
    weeklyPlan: weekPlan
      ? {
          id: weekPlan.id,
          status: weekPlan.status,
          weekStart: weekPlan.weekStart,
          preparedAt: weekPlan.plannedAt,
          reportStatus: weekPlan.report?.status ?? null,
          reportSubmittedAt: weekPlan.report?.submittedAt ?? null,
        }
      : null,
    tasks: {
      open: openTasks,
      overdue: overdueTasks,
      dueThisWeek: dueThisWeekTasks,
    },
    commercial: {
      totalLeads: pipeline.total,
      openLeads: pipeline.open,
      pipelineValue: pipeline.pipelineValue,
      weightedPipeline: pipeline.weightedPipeline,
      won: pipeline.won,
      lost: pipeline.lost,
      wonValue: pipeline.wonValue,
      winRate: pipeline.winRate,
      averageDealSize: pipeline.averageDealSize,
      staleLeads,
      overdueFollowUps,
      leadsByStatus: pipeline.byStatus,
      followUps,
    },
    marketing: {
      activities: marketingActivities.length,
      activeActivities,
      budget: marketingBudget,
      spend: marketingSpend,
      attributedLeads,
      costPerLead: costPerLead(marketingSpend, attributedLeads),
    },
    projects: {
      active: projectsWithRevenue,
      activeRevenue: activeProjectRevenue,
    },
    finance: {
      income,
      expenses,
      netProfit: netProfit(income, expenses),
      personalSpent,
      allowance,
      allocations: allocations.allocations,
      totalReserved: allocations.totalReserved,
      unallocated: allocations.unallocated,
      allocationRuleCount: allocationRules.length,
    },
    reminders: {
      upcoming: upcomingReminders,
      meetings,
      overdue: overdueReminders,
      overdueCount: overdueReminders.length,
      hasOverdue: overdueReminders.length > 0,
      now: nowTime,
    },
  };
}
