import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/currency";
import {
  addDays,
  addMonths,
  formatDate,
  formatWeekRange,
  startOfMonth,
  startOfWeek,
  todayDateOnly,
  zonedNow,
} from "@/lib/datetime";
import { summarizeCommercialWindow } from "@/lib/commercial";
import { toNumber } from "@/lib/utils";
import {
  dayProgress,
  performanceMetrics,
  periodComparison,
  summarizeSessions,
  summarizeTasks,
} from "@/lib/daily-work";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { TrendStat } from "@/components/performance/TrendStat";

export const metadata = { title: "Performance Analysis" };
export const dynamic = "force-dynamic";

type SessionRow = {
  date: Date;
  sessionNumber: number;
  plannedMinutes: number;
  actualMinutes: number | null;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "MISSED" | "RESCHEDULED";
};

type TaskRow = {
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  isRequired: boolean;
  dueDate: Date | null;
  completedAt: Date | null;
};

function inWindow<T extends { date: Date }>(rows: T[], from: Date, to: Date): T[] {
  return rows.filter((r) => r.date.getTime() >= from.getTime() && r.date.getTime() < to.getTime());
}

function tasksCompletedIn(tasks: TaskRow[], from: Date, to: Date): TaskRow[] {
  return tasks.filter(
    (t) => t.completedAt && t.completedAt.getTime() >= from.getTime() && t.completedAt.getTime() < to.getTime(),
  );
}

export default async function PerformancePage() {
  await requireUser();
  const now = zonedNow();
  const today = todayDateOnly();

  const thisWeekStart = startOfWeek(today);
  const lastWeekStart = addDays(thisWeekStart, -7);
  const thisMonthStart = startOfMonth(now);
  const nextMonthStart = addMonths(thisMonthStart, 1);
  const lastMonthStart = addMonths(thisMonthStart, -1);

  const [sessions, tasks, leads] = await Promise.all([
    prisma.workSession.findMany({
      where: { date: { gte: addDays(lastMonthStart, -1) } },
      select: {
        date: true,
        sessionNumber: true,
        plannedMinutes: true,
        actualMinutes: true,
        status: true,
      },
    }),
    prisma.task.findMany({
      select: {
        status: true,
        priority: true,
        isRequired: true,
        dueDate: true,
        completedAt: true,
      },
    }),
    prisma.lead.findMany({
      select: {
        status: true,
        estimatedValue: true,
        createdAt: true,
        convertedAt: true,
        updatedAt: true,
      },
    }),
  ]);

  const s = sessions as SessionRow[];
  const t = tasks as TaskRow[];
  const leadRows = leads.map((l) => ({
    status: l.status,
    estimatedValue: toNumber(l.estimatedValue),
    createdAt: l.createdAt,
    convertedAt: l.convertedAt,
    updatedAt: l.updatedAt,
  }));

  const todaySessions = s.filter((row) => row.date.getTime() === today.getTime());
  const todayProgress = dayProgress(todaySessions);
  const todayTasks = t.filter(
    (task) =>
      task.dueDate && task.dueDate.getTime() === today.getTime() &&
      (task.status === "TODO" || task.status === "IN_PROGRESS" || task.status === "BLOCKED"),
  );

  const mThisWeek = performanceMetrics(
    inWindow(s, thisWeekStart, addDays(thisWeekStart, 7)),
    t,
    now,
  );
  const mLastWeek = performanceMetrics(
    inWindow(s, lastWeekStart, thisWeekStart),
    t,
    now,
  );
  const mThisMonth = performanceMetrics(
    inWindow(s, thisMonthStart, nextMonthStart),
    t,
    now,
  );
  const mLastMonth = performanceMetrics(
    inWindow(s, lastMonthStart, thisMonthStart),
    t,
    now,
  );

  const monthSessionsThis = summarizeSessions(inWindow(s, thisMonthStart, nextMonthStart));
  const monthSessionsLast = summarizeSessions(inWindow(s, lastMonthStart, thisMonthStart));

  const weekTasksThis = tasksCompletedIn(t, thisWeekStart, addDays(thisWeekStart, 7));
  const weekTasksLast = tasksCompletedIn(t, lastWeekStart, thisWeekStart);
  const monthTasksThis = tasksCompletedIn(t, thisMonthStart, nextMonthStart);
  const monthTasksLast = tasksCompletedIn(t, lastMonthStart, thisMonthStart);

  const commercialWeek = summarizeCommercialWindow(leadRows, {
    from: thisWeekStart,
    to: addDays(thisWeekStart, 7),
  });
  const commercialMonth = summarizeCommercialWindow(leadRows, {
    from: thisMonthStart,
    to: nextMonthStart,
  });

  const sessionRateThis = periodComparison(
    mThisWeek.sessionCompletionRate,
    mLastWeek.sessionCompletionRate,
  );
  const hoursThis = periodComparison(mThisWeek.completedHours, mLastWeek.completedHours);
  const completedThis = periodComparison(
    mThisWeek.completedSessions,
    mLastWeek.completedSessions,
  );
  const missedThis = periodComparison(mThisWeek.missedSessions, mLastWeek.missedSessions);
  const reschedThis = periodComparison(
    mThisWeek.rescheduledSessions,
    mLastWeek.rescheduledSessions,
  );
  const tasksThis = periodComparison(
    weekTasksThis.length,
    weekTasksLast.length,
  );

  const monthSessionRate = periodComparison(
    mThisMonth.sessionCompletionRate,
    mLastMonth.sessionCompletionRate,
  );
  const monthHours = periodComparison(
    monthSessionsThis.actualHours,
    monthSessionsLast.actualHours,
  );
  const monthCompleted = periodComparison(
    mThisMonth.completedSessions,
    mLastMonth.completedSessions,
  );
  const monthMissed = periodComparison(
    mThisMonth.missedSessions,
    mLastMonth.missedSessions,
  );
  const monthResched = periodComparison(
    mThisMonth.rescheduledSessions,
    mLastMonth.rescheduledSessions,
  );
  const monthTasks = periodComparison(
    monthTasksThis.length,
    monthTasksLast.length,
  );

  const openTaskSummary = summarizeTasks(t, now);

  const weeklySeries = Array.from({ length: 6 }, (_, index) => {
    const start = addDays(thisWeekStart, -7 * (5 - index));
    const end = addDays(start, 7);
    const summary = summarizeSessions(inWindow(s, start, end));
    return { start, summary };
  });

  return (
    <div>
      <PageHeader
        title="Performance Analysis"
        description="Daily, weekly and monthly completion, planned versus completed hours, missed and rescheduled sessions, tasks and commercial results — based only on recorded data."
      />

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Today</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Sessions complete"
            value={`${todayProgress.completed}/${todayProgress.total}`}
            tone={todayProgress.isComplete ? "success" : "default"}
          />
          <StatCard
            label="Hours worked"
            value={todayProgress.actualHours.toFixed(1)}
            hint={`of ${todayProgress.plannedHours.toFixed(1)} planned`}
          />
          <StatCard
            label="Daily completion"
            value={`${Math.round(todayProgress.rate * 100)}%`}
            tone={todayProgress.isComplete ? "success" : "warning"}
          />
          <StatCard label="Tasks due today" value={todayTasks.length} tone="brand" />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          This week vs last week · {formatWeekRange(thisWeekStart)}
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <TrendStat
            label="Sessions completed"
            value={mThisWeek.completedSessions}
            delta={completedThis.delta}
            deltaPct={completedThis.deltaPct}
            direction={completedThis.direction}
          />
          <TrendStat
            label="Hours completed"
            value={mThisWeek.completedHours.toFixed(1)}
            delta={hoursThis.delta}
            deltaPct={hoursThis.deltaPct}
            direction={hoursThis.direction}
          />
          <TrendStat
            label="Completion rate"
            value={`${Math.round(mThisWeek.sessionCompletionRate * 100)}%`}
            delta={sessionRateThis.delta * 100}
            deltaPct={sessionRateThis.deltaPct}
            direction={sessionRateThis.direction}
          />
          <TrendStat
            label="Tasks completed"
            value={weekTasksThis.length}
            delta={tasksThis.delta}
            deltaPct={tasksThis.deltaPct}
            direction={tasksThis.direction}
          />
          <TrendStat
            label="Missed sessions"
            value={mThisWeek.missedSessions}
            delta={missedThis.delta}
            deltaPct={missedThis.deltaPct}
            direction={missedThis.direction}
            goodWhen="down"
          />
          <TrendStat
            label="Rescheduled"
            value={mThisWeek.rescheduledSessions}
            delta={reschedThis.delta}
            deltaPct={reschedThis.deltaPct}
            direction={reschedThis.direction}
            goodWhen="down"
          />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          This month vs last month · {formatDate(thisMonthStart, "MMMM yyyy")}
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <TrendStat
            label="Sessions completed"
            value={mThisMonth.completedSessions}
            delta={monthCompleted.delta}
            deltaPct={monthCompleted.deltaPct}
            direction={monthCompleted.direction}
          />
          <TrendStat
            label="Hours completed"
            value={monthSessionsThis.actualHours.toFixed(1)}
            delta={monthHours.delta}
            deltaPct={monthHours.deltaPct}
            direction={monthHours.direction}
          />
          <TrendStat
            label="Completion rate"
            value={`${Math.round(mThisMonth.sessionCompletionRate * 100)}%`}
            delta={monthSessionRate.delta * 100}
            deltaPct={monthSessionRate.deltaPct}
            direction={monthSessionRate.direction}
          />
          <TrendStat
            label="Missed sessions"
            value={mThisMonth.missedSessions}
            delta={monthMissed.delta}
            deltaPct={monthMissed.deltaPct}
            direction={monthMissed.direction}
            goodWhen="down"
          />
          <TrendStat
            label="Rescheduled"
            value={mThisMonth.rescheduledSessions}
            delta={monthResched.delta}
            deltaPct={monthResched.deltaPct}
            direction={monthResched.direction}
            goodWhen="down"
          />
          <TrendStat
            label="Tasks completed"
            value={monthTasksThis.length}
            delta={monthTasks.delta}
            deltaPct={monthTasks.deltaPct}
            direction={monthTasks.direction}
          />
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Commercial results"
            subtitle="Recorded pipeline outcomes alongside effort."
          />
          <CardBody>
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                label="Leads created (week)"
                value={commercialWeek.created}
              />
              <StatCard
                label="Deals won (week)"
                value={commercialWeek.won}
                tone="success"
              />
              <StatCard
                label="Won value (week)"
                value={formatCurrency(commercialWeek.wonValue)}
                tone="brand"
              />
              <StatCard
                label="Open pipeline"
                value={formatCurrency(commercialWeek.pipelineValue)}
                tone="warning"
              />
              <StatCard
                label="Leads created (month)"
                value={commercialMonth.created}
              />
              <StatCard
                label="Won value (month)"
                value={formatCurrency(commercialMonth.wonValue)}
                tone="brand"
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Task discipline"
            subtitle="Open, required and overdue work."
          />
          <CardBody>
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="Open tasks" value={openTaskSummary.open} />
              <StatCard
                label="Required open"
                value={openTaskSummary.requiredOpen}
                tone="brand"
              />
              <StatCard
                label="Blocked"
                value={openTaskSummary.blocked}
                tone="danger"
              />
              <StatCard
                label="Overdue"
                value={openTaskSummary.overdue}
                tone="danger"
              />
            </div>
          </CardBody>
        </Card>
      </section>

      <section className="mt-6">
        <Card>
          <CardHeader
            title="Last 6 weeks · session completion"
            subtitle="Consistency based only on recorded sessions."
          />
          <CardBody>
            <ul className="space-y-3">
              {weeklySeries.map(({ start, summary }) => (
                <li key={start.toISOString()}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-slate-600">
                      {formatWeekRange(start)}
                    </span>
                    <span className="text-slate-500 tabular-nums">
                      {summary.completed}/{summary.planned} ·{" "}
                      {Math.round(summary.completionRate * 100)}%
                    </span>
                  </div>
                  <ProgressBar
                    value={summary.completionRate}
                    tone={
                      summary.completionRate >= 0.8
                        ? "success"
                        : summary.completionRate >= 0.5
                          ? "warning"
                          : "danger"
                    }
                  />
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
