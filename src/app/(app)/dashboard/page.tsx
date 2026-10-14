import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/currency";
import {
  computeFinancialPlan,
  summarizeFinance,
} from "@/lib/finance";
import { financeEntrySelect, monthlyAllowanceTarget } from "@/lib/finance-queries";
import {
  addMonths,
  formatDate,
  startOfMonth,
  todayDateOnly,
  zonedNow,
} from "@/lib/datetime";
import { effectiveReminderStatus } from "@/lib/rules";
import {
  groupSessionsByDay,
  isTaskOverdue,
} from "@/lib/daily-work";
import { generateReminders } from "@/lib/reminder-engine";
import { REMINDER_TYPE_LABELS } from "@/lib/labels";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { buttonClasses } from "@/components/ui/Button";
import { GenerateRemindersButton } from "@/components/dashboard/GenerateRemindersButton";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const OPEN_TASK_STATUSES = ["TODO", "IN_PROGRESS", "BLOCKED"] as const;

export default async function DashboardPage() {
  const user = await requireUser();
  const monthStart = startOfMonth(zonedNow());
  const monthEnd = addMonths(monthStart, 1);
  const now = zonedNow();
  const today = todayDateOnly();

  // Keep advisory reminders in sync with recorded data on every visit. This is
  // idempotent and never completes the underlying work item; a failure here
  // must not stop the dashboard from rendering.
  try {
    await generateReminders(now);
  } catch {
    // Reminder generation is best-effort; the dashboard still renders.
  }

  const [entries, rules, reminders, openTasks, openSessions] = await Promise.all([
    prisma.financeEntry.findMany({ select: financeEntrySelect }),
    prisma.financialAllocation.findMany({ orderBy: { sequence: "asc" } }),
    prisma.reminder.findMany({ orderBy: { dueAt: "asc" }, take: 50 }),
    prisma.task.findMany({
      where: { status: { in: [...OPEN_TASK_STATUSES] }, dueDate: { lt: now } },
      orderBy: { dueDate: "asc" },
      take: 8,
      include: { project: { select: { name: true } } },
    }),
    prisma.workSession.findMany({
      where: { status: { in: ["PLANNED", "IN_PROGRESS"] }, date: { lte: today } },
      orderBy: { date: "asc" },
      take: 30,
    }),
  ]);

  const overdueReminders = reminders.filter(
    (r) => effectiveReminderStatus({ status: r.status, dueAt: r.dueAt }, now) === "OVERDUE",
  );
  const pendingReminders = reminders.filter(
    (r) => effectiveReminderStatus({ status: r.status, dueAt: r.dueAt }, now) === "PENDING",
  );
  const incompleteDays = groupSessionsByDay(
    openSessions.map((s) => ({
      date: s.date,
      sessionNumber: s.sessionNumber,
      status: s.status,
    })),
  );

  const monthEntries = entries.filter(
    (e) => e.occurredAt && e.occurredAt >= monthStart && e.occurredAt < monthEnd,
  );
  const summary = summarizeFinance(monthEntries);
  const life = summarizeFinance(entries);

  const { target: allowanceTarget } = await monthlyAllowanceTarget(
    monthStart,
    user.monthlyAllowance,
  );
  const plan = computeFinancialPlan({
    grossReceived: summary.receivedIncome,
    businessExpenses: summary.businessExpenses,
    allowanceTarget,
    rules: rules.map((r) => ({
      category: r.category,
      method: r.method,
      value: r.value,
      basis: r.basis,
      sequence: r.sequence,
      isActive: r.isActive,
    })),
  });
  const allowancePct =
    allowanceTarget > 0 ? summary.personalExpenses / allowanceTarget : 0;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of revenue, profit, personal allowance and outstanding money."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Received this month"
          value={formatCurrency(summary.receivedIncome, user.currency)}
          tone="success"
        />
        <StatCard
          label="Net profit this month"
          value={formatCurrency(summary.netProfit, user.currency)}
          tone={summary.netProfit >= 0 ? "brand" : "danger"}
        />
        <StatCard
          label="Personal available"
          value={formatCurrency(plan.personalAvailable, user.currency)}
          tone="brand"
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(life.outstandingPayments, user.currency)}
          tone="warning"
        />
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader
            title="Personal allowance"
            action={
              <Link href="/finance/allowance" className={buttonClasses("ghost", "sm")}>
                Manage
              </Link>
            }
          />
          <CardBody>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-slate-600">
                Personal spending used: {Math.round(allowancePct * 100)}%
              </span>
              <span className="text-slate-500">
                {formatCurrency(summary.personalExpenses)} of {formatCurrency(allowanceTarget)}
              </span>
            </div>
            <ProgressBar
              value={allowancePct}
              tone={allowancePct >= 1 ? "danger" : allowancePct >= 0.75 ? "warning" : "success"}
            />
          </CardBody>
        </Card>
      </div>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-700">Needs attention</h2>
          <GenerateRemindersButton />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader
              title="Overdue reminders"
              subtitle="Dismissing a reminder never completes the underlying task."
              action={
                <Link href="/reminders" className={buttonClasses("ghost", "sm")}>
                  View
                </Link>
              }
            />
            <CardBody>
              {overdueReminders.length === 0 ? (
                <p className="text-xs text-slate-400">Nothing overdue. </p>
              ) : (
                <ul className="space-y-2">
                  {overdueReminders.slice(0, 6).map((r) => (
                    <li key={r.id} className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-slate-700">{r.title}</p>
                        <p className="text-xs text-slate-400">
                          {REMINDER_TYPE_LABELS[r.type]} · due {formatDate(r.dueAt)}
                        </p>
                      </div>
                      <Badge tone="danger">Overdue</Badge>
                    </li>
                  ))}
                </ul>
              )}
              {pendingReminders.length > 0 ? (
                <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3">
                  {pendingReminders.slice(0, 4).map((r) => (
                    <li key={r.id} className="truncate text-xs text-slate-500">
                      {r.title}
                    </li>
                  ))}
                </ul>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Overdue tasks"
              action={
                <Link href="/tasks" className={buttonClasses("ghost", "sm")}>
                  View
                </Link>
              }
            />
            <CardBody>
              {openTasks.length === 0 ? (
                <p className="text-xs text-slate-400">No overdue tasks.</p>
              ) : (
                <ul className="space-y-2">
                  {openTasks.map((task) => (
                    <li key={task.id} className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-slate-700">{task.title}</p>
                        <p className="text-xs text-slate-400">
                          Due {task.dueDate ? formatDate(task.dueDate) : "—"}
                          {task.project?.name ? ` · ${task.project.name}` : ""}
                        </p>
                      </div>
                      <Badge tone="danger">Overdue</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Incomplete sessions"
              action={
                <Link href="/daily-work" className={buttonClasses("ghost", "sm")}>
                  Daily work
                </Link>
              }
            />
            <CardBody>
              {incompleteDays.length === 0 ? (
                <p className="text-xs text-slate-400">
                  No outstanding sessions.
                </p>
              ) : (
                <ul className="space-y-2">
                  {incompleteDays.slice(-6).reverse().map((day) => (
                    <li key={day.date.toISOString()}>
                      <Link
                        href={`/daily-work?date=${day.date.toISOString().slice(0, 10)}`}
                        className="flex items-center justify-between text-sm text-slate-700 hover:underline"
                      >
                        <span>{formatDate(day.date, "EEE, MMM d")}</span>
                        <Badge tone="warning">
                          {day.sessions.length} open
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {openTasks.some((task) =>
                isTaskOverdue(
                  { status: task.status, priority: task.priority, dueDate: task.dueDate },
                  now,
                ),
              ) ? (
                <p className="mt-3 text-xs text-red-500">
                  Reschedule or complete overdue tasks — they are not marked done
                  automatically.
                </p>
              ) : null}
            </CardBody>
          </Card>
        </div>
      </section>
    </div>
  );
}
