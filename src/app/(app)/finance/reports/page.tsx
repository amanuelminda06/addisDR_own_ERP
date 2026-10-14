import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/currency";
import { toNumber } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { formatMonth, startOfMonth, zonedNow } from "@/lib/datetime";
import {
  incomeExpenditureTrend,
  projectFinancialSummary,
  summarizeFinance,
} from "@/lib/finance";
import { financeEntrySelect } from "@/lib/finance-queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = { title: "Financial reports" };
export const dynamic = "force-dynamic";

export default async function FinanceReportsPage() {
  const user = await requireUser();
  const monthStart = startOfMonth(zonedNow());
  const months = lastMonths(monthStart, 6);

  const [entries, projects] = await Promise.all([
    prisma.financeEntry.findMany({ select: financeEntrySelect }),
    prisma.project.findMany({
      select: {
        id: true,
        name: true,
        budget: true,
        agreedPrice: true,
        payments: { select: { amount: true } },
        collectionSchedule: { select: { status: true, expectedDate: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const trend = incomeExpenditureTrend(entries, months);
  const lifetime = summarizeFinance(entries);

  const projectRows = projects
    .map((p) => ({
      project: p,
      summary: projectFinancialSummary(
        p,
        entries.filter((e) => e.projectId === p.id),
      ),
    }))
    .sort((a, b) => b.summary.received - a.summary.received);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial reports"
        description="Monthly trends and profitability per project."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Received (all time)" value={formatCurrency(lifetime.receivedIncome, user.currency)} tone="success" />
        <StatCard label="Business expenses (all time)" value={formatCurrency(lifetime.businessExpenses, user.currency)} tone="danger" />
        <StatCard label="Personal spending (all time)" value={formatCurrency(lifetime.personalExpenses, user.currency)} />
        <StatCard label="Outstanding (all time)" value={formatCurrency(lifetime.outstandingPayments, user.currency)} tone="warning" />
      </div>

      <Card>
        <CardHeader title="Last 6 months" subtitle="Received income, business expenses and profit" />
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-2 font-medium">Month</th>
                  <th className="px-5 py-2 text-right font-medium">Received</th>
                  <th className="px-5 py-2 text-right font-medium">Business expenses</th>
                  <th className="px-5 py-2 text-right font-medium">Net profit</th>
                  <th className="px-5 py-2 text-right font-medium">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trend.map((bucket) => (
                  <tr key={bucket.monthStart.toISOString()}>
                    <td className="px-5 py-2 text-slate-700">
                      {formatMonth(bucket.monthStart)}
                    </td>
                    <td className="px-5 py-2 text-right tabular-nums text-emerald-700">
                      {formatCurrency(bucket.summary.receivedIncome)}
                    </td>
                    <td className="px-5 py-2 text-right tabular-nums text-red-600">
                      {formatCurrency(bucket.summary.businessExpenses)}
                    </td>
                    <td className="px-5 py-2 text-right tabular-nums font-medium text-slate-900">
                      {formatCurrency(bucket.summary.netProfit)}
                    </td>
                    <td className="px-5 py-2 text-right tabular-nums text-amber-700">
                      {formatCurrency(bucket.summary.outstandingPayments)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Profitability by project"
          subtitle="Agreed value is the project budget; received is actual cash in."
        />
        <CardBody className="p-0">
          {projectRows.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No projects yet" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-2 font-medium">Project</th>
                    <th className="px-5 py-2 text-right font-medium">Agreed</th>
                    <th className="px-5 py-2 text-right font-medium">Received</th>
                    <th className="px-5 py-2 text-right font-medium">Outstanding</th>
                    <th className="px-5 py-2 text-right font-medium">Expenses</th>
                    <th className="px-5 py-2 text-right font-medium">Net profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projectRows.map(({ project, summary }) => (
                    <tr key={project.id}>
                      <td className="px-5 py-2 text-slate-700">
                        {project.name}
                        {summary.overAgreed ? (
                          <span className="ml-2 text-xs text-red-500">over agreed</span>
                        ) : null}
                        {toNumber(project.agreedPrice ?? project.budget) > 0 &&
                        project.payments.reduce((sum, p) => sum + toNumber(p.amount), 0) <
                          toNumber(project.agreedPrice ?? project.budget) ? (
                          <span className="ml-2 text-xs text-amber-600">balance open</span>
                        ) : null}
                      </td>
                      <td className="px-5 py-2 text-right tabular-nums text-slate-600">
                        {formatCurrency(summary.agreedValue)}
                      </td>
                      <td className="px-5 py-2 text-right tabular-nums text-emerald-700">
                        {formatCurrency(summary.received)}
                      </td>
                      <td className="px-5 py-2 text-right tabular-nums text-amber-700">
                        {formatCurrency(summary.outstanding)}
                      </td>
                      <td className="px-5 py-2 text-right tabular-nums text-red-600">
                        {formatCurrency(summary.expenses)}
                      </td>
                      <td className="px-5 py-2 text-right tabular-nums font-medium text-slate-900">
                        {formatCurrency(summary.netProfit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function lastMonths(currentMonthStart: Date, count: number): Date[] {
  const months: Date[] = [];
  for (let i = count - 1; i >= 0; i--) {
    months.push(
      new Date(
        Date.UTC(
          currentMonthStart.getUTCFullYear(),
          currentMonthStart.getUTCMonth() - i,
          1,
        ),
      ),
    );
  }
  return months;
}
