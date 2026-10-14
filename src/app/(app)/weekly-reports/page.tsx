import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/currency";
import {
  formatWeekRange,
  startOfWeek,
  todayDateOnly,
} from "@/lib/datetime";
import { summarizeCommercialWindow } from "@/lib/commercial";
import { WEEKLY_REPORT_STATUS_LABELS } from "@/lib/labels";
import { summarizeFinance } from "@/lib/finance";
import { financeEntrySelect } from "@/lib/finance-queries";
import { recentWeekPlans } from "@/lib/report-queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/Button";

export const metadata = { title: "Weekly Reports" };
export const dynamic = "force-dynamic";

const REPORT_TONE = {
  SUBMITTED: "success",
  LATE: "danger",
  DRAFT: "warning",
} as const;

export default async function WeeklyReportsPage() {
  await requireUser();

  const currentWeekStart = startOfWeek(todayDateOnly());

  const [plans, leads, entries] = await Promise.all([
    recentWeekPlans(12),
    prisma.lead.findMany({
      select: {
        status: true,
        estimatedValue: true,
        createdAt: true,
        convertedAt: true,
        updatedAt: true,
      },
    }),
    prisma.financeEntry.findMany({ select: financeEntrySelect }),
  ]);

  const weeks = plans.map((plan) => {
    const commercial = summarizeCommercialWindow(
      leads.map((l) => ({
        status: l.status,
        estimatedValue: toNumber(l.estimatedValue),
        createdAt: l.createdAt,
        convertedAt: l.convertedAt,
        updatedAt: l.updatedAt,
      })),
      { from: plan.weekStart, to: plan.weekEnd },
    );
    const weekEntries = entries.filter(
      (e) => e.occurredAt && e.occurredAt >= plan.weekStart && e.occurredAt < plan.weekEnd,
    );
    const finance = summarizeFinance(weekEntries);
    return { plan, commercial, finance };
  });

  const totals = {
    submitted: await prisma.weeklyReport.count({ where: { status: "SUBMITTED" } }),
    draft: await prisma.weeklyReport.count({ where: { status: "DRAFT" } }),
    late: await prisma.weeklyReport.count({ where: { status: "LATE" } }),
    weeks: await prisma.weekPlan.count(),
  };

  const latest = weeks[0] ?? null;
  const life = summarizeFinance(entries);
  const currentPlan = plans.find(
    (p) => p.weekStart.getTime() === currentWeekStart.getTime(),
  );

  return (
    <div>
      <PageHeader
        title="Weekly Reports"
        description="Saturday accountability reports: Done this week, Numbers, What didn't work, Key takeaways, Next week's goals and Need help with."
        action={
          currentPlan ? (
            <Link
              href={`/weekly-reports/${currentPlan.id}`}
              className={buttonClasses("primary", "sm")}
            >
              Open this week&apos;s report
            </Link>
          ) : (
            <Link href="/tasks" className={buttonClasses("outline", "sm")}>
              Plan this week first
            </Link>
          )
        }
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Submitted" value={totals.submitted} tone="success" />
        <StatCard label="Drafts" value={totals.draft} tone="warning" />
        <StatCard label="Late" value={totals.late} tone="danger" />
        <StatCard label="Weeks tracked" value={totals.weeks} />
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Net profit (all time)"
          value={formatCurrency(life.netProfit)}
          tone={life.netProfit >= 0 ? "brand" : "danger"}
        />
        <StatCard
          label="Received (all time)"
          value={formatCurrency(life.receivedIncome)}
          tone="success"
        />
        <StatCard
          label="Business expenses (all time)"
          value={formatCurrency(life.businessExpenses)}
          tone="danger"
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(life.outstandingPayments)}
          tone="warning"
        />
      </section>

      {latest ? (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            Latest week · {formatWeekRange(latest.plan.weekStart)}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Leads created"
              value={latest.commercial.created}
            />
            <StatCard
              label="Deals won"
              value={latest.commercial.won}
              tone="success"
            />
            <StatCard
              label="Received this week"
              value={formatCurrency(latest.finance.receivedIncome)}
              tone="success"
            />
            <StatCard
              label="Net profit"
              value={formatCurrency(latest.finance.netProfit)}
              tone={latest.finance.netProfit >= 0 ? "brand" : "danger"}
            />
          </div>
        </section>
      ) : null}

      <section className="mt-6">
        <Card>
          <CardHeader
            title="Reports by week"
            subtitle="Open a week to write or submit its report. Numbers are pulled automatically."
          />
          <CardBody>
            {weeks.length === 0 ? (
              <EmptyState
                title="No weekly plans yet"
                description="Create a weekly plan in Tasks & Weekly Planning to start reporting."
                action={
                  <Link href="/tasks" className={buttonClasses("primary", "sm")}>
                    Go to planning
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {weeks.map(({ plan, commercial, finance }) => (
                  <li
                    key={plan.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800">
                        {formatWeekRange(plan.weekStart)}
                      </p>
                      <p className="text-xs text-slate-400">
                        Won {commercial.won} · Received{" "}
                        {formatCurrency(finance.receivedIncome)} · Net{" "}
                        {formatCurrency(finance.netProfit)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        tone={
                          plan.report
                            ? REPORT_TONE[plan.report.status]
                            : "muted"
                        }
                      >
                        {plan.report
                          ? WEEKLY_REPORT_STATUS_LABELS[plan.report.status]
                          : "Not started"}
                      </Badge>
                      <Link
                        href={`/weekly-reports/${plan.id}`}
                        className={buttonClasses("outline", "sm")}
                      >
                        Open
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
