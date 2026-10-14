import { toNumber } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { requireUser } from "@/lib/auth";
import { addMonths, formatDate, formatMonth, startOfMonth, zonedNow } from "@/lib/datetime";
import { allowanceAdjustmentForMonth, personalExpenses } from "@/lib/finance";
import { prisma } from "@/lib/prisma";
import { deleteAllowanceAdjustmentAction } from "@/lib/actions/finance";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { AllowanceAdjustmentForm } from "@/components/finance/AllowanceAdjustmentForm";
import { ConfirmDeleteButton } from "@/components/finance/ConfirmDeleteButton";

export const metadata = { title: "Allowance" };
export const dynamic = "force-dynamic";

export default async function AllowancePage() {
  const user = await requireUser();
  const monthStart = startOfMonth(zonedNow());

  const [adjustments, monthEntries] = await Promise.all([
    prisma.allowanceAdjustment.findMany({ orderBy: { startMonth: "desc" } }),
    prisma.financeEntry.findMany({
      where: {
        type: "EXPENSE",
        occurredAt: { gte: monthStart, lt: addMonths(monthStart, 1) },
      },
      select: {
        type: true,
        amount: true,
        paymentStatus: true,
        expenseClass: true,
        category: true,
        occurredAt: true,
      },
    }),
  ]);

  const base = toNumber(user.monthlyAllowance);
  const adjustment = allowanceAdjustmentForMonth(adjustments, monthStart);
  const target = Math.max(base - adjustment, 0);
  const spent = personalExpenses(monthEntries);
  const remaining = target - spent;
  const pct = target > 0 ? spent / target : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Personal allowance"
        description={`Your ${formatCurrency(base)} monthly allowance for ${formatMonth(monthStart)}.`}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Allowance this month"
          value={formatCurrency(target, user.currency)}
          tone="brand"
          hint={adjustment > 0 ? `${formatCurrency(adjustment)} reduced by adjustments` : undefined}
        />
        <StatCard
          label="Spent this month"
          value={formatCurrency(spent, user.currency)}
        />
        <StatCard
          label={remaining >= 0 ? "Remaining" : "Over budget"}
          value={formatCurrency(Math.abs(remaining), user.currency)}
          tone={remaining >= 0 ? "success" : "danger"}
        />
      </div>

      <Card>
        <CardBody>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-slate-600">Used {Math.round(pct * 100)}%</span>
            <span className="text-slate-500">
              {formatCurrency(spent)} of {formatCurrency(target)}
            </span>
          </div>
          <ProgressBar
            value={pct}
            tone={pct >= 1 ? "danger" : pct >= 0.75 ? "warning" : "success"}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Adjustments"
          subtitle="Borrow against (or add back to) your allowance for a number of months."
        />
        <CardBody className="space-y-4">
          <AllowanceAdjustmentForm />
          {adjustments.length === 0 ? (
            <EmptyState title="No adjustments" description="Your allowance runs at its full value." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {adjustments.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">{a.reason}</p>
                    <p className="text-xs text-slate-500">
                      {formatCurrency(toNumber(a.amount))} over {a.monthsCount} month
                      {adjustments.length === 1 ? "" : "s"} · from{" "}
                      {formatDate(a.startMonth)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm tabular-nums text-slate-900">
                      −{formatCurrency(toNumber(a.amount) / Math.max(a.monthsCount, 1))}/mo
                    </span>
                    <ConfirmDeleteButton
                      id={a.id}
                      action={deleteAllowanceAdjustmentAction}
                      message="Delete this allowance adjustment?"
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
