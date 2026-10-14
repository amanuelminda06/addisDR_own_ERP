import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { requireUser } from "@/lib/auth";
import { formatDate, startOfMonth, zonedNow, formatMonth } from "@/lib/datetime";
import {
  allowanceAdjustmentForMonth,
  computeFinancialPlan,
  outstandingPayments,
  summarizeFinance,
  totalSavings,
  type SavingsFundValue,
} from "@/lib/finance";
import {
  ALLOCATION_CATEGORY_LABELS,
  EXPENSE_CLASS_LABELS,
  PAYMENT_STATUS_LABELS,
  SAVINGS_FUND_LABELS,
} from "@/lib/labels";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/Button";
import { Icon } from "@/components/icons";

export const metadata = { title: "Finance" };
export const dynamic = "force-dynamic";

const entrySelect = {
  id: true,
  type: true,
  category: true,
  amount: true,
  amountReceived: true,
  paymentStatus: true,
  expenseClass: true,
  occurredAt: true,
  projectId: true,
  clientId: true,
  reference: true,
  description: true,
  dueDate: true,
} as const;

export default async function FinancePage() {
  const user = await requireUser();
  const now = zonedNow();
  const monthStart = startOfMonth(now);

  const [entries, rules, accounts, transactions, adjustments] = await Promise.all([
    prisma.financeEntry.findMany({ select: entrySelect, orderBy: { occurredAt: "desc" } }),
    prisma.financialAllocation.findMany({ orderBy: { sequence: "asc" } }),
    prisma.savingsAccount.findMany({ orderBy: { fund: "asc" } }),
    prisma.savingsTransaction.findMany({ orderBy: { occurredAt: "desc" } }),
    prisma.allowanceAdjustment.findMany(),
  ]);

  const monthEntries = entries.filter(
    (e) => e.occurredAt && e.occurredAt >= monthStart && e.occurredAt < nextMonth(monthStart),
  );
  const summary = summarizeFinance(monthEntries);
  const lifeSummary = summarizeFinance(entries);

  const adjustment = allowanceAdjustmentForMonth(adjustments, monthStart);
  const allowanceTarget = Math.max(toNumber(user.monthlyAllowance) - adjustment, 0);

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

  const balances = aggregateSavings(accounts, transactions);
  const savingsTotal = totalSavings(balances);
  const outstanding = entries
    .map((e) => ({ entry: e, amount: outstandingPayments([e]) }))
    .filter((x) => x.amount > 0)
    .slice(0, 6);

  const allowanceUsedPct =
    allowanceTarget > 0 ? summary.personalExpenses / allowanceTarget : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance"
        description={`Received income only is allocated and taxed. Showing ${formatMonth(monthStart)}.`}
        action={
          <Link href="/finance/income" className={buttonClasses("primary", "md")}>
            Record income
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2">
        {[
          { href: "/finance/income", label: "Income" },
          { href: "/finance/expenses", label: "Expenses" },
          { href: "/finance/allocations", label: "Allocation rules" },
          { href: "/finance/savings", label: "Savings" },
          { href: "/finance/allowance", label: "Allowance" },
          { href: "/finance/investments", label: "Investments" },
          { href: "/finance/reports", label: "Reports" },
        ].map((l) => (
          <Link key={l.href} href={l.href} className={buttonClasses("outline", "sm")}>
            {l.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={`Income received (${formatMonth(monthStart)})`}
          value={formatCurrency(summary.receivedIncome, user.currency)}
          tone="success"
          icon={<Icon name="TrendingUp" className="h-4 w-4" />}
        />
        <StatCard
          label="Net profit this month"
          value={formatCurrency(summary.netProfit, user.currency)}
          tone={summary.netProfit >= 0 ? "brand" : "danger"}
        />
        <div className="card p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Personal allowance
            </p>
            <span className="text-slate-400">
              <Icon name="Wallet" className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
            {formatCurrency(plan.personalAvailable, user.currency)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            of {formatCurrency(allowanceTarget)} target
          </p>
          <ProgressBar
            className="mt-2"
            value={allowanceUsedPct}
            tone={allowanceUsedPct >= 1 ? "danger" : allowanceUsedPct >= 0.75 ? "warning" : "success"}
          />
        </div>
        <StatCard
          label="Outstanding payments"
          value={formatCurrency(lifeSummary.outstandingPayments)}
          tone={lifeSummary.outstandingPayments > 0 ? "warning" : "default"}
          hint={`${outstanding.length} invoice${outstanding.length === 1 ? "" : "s"} unpaid`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={`Allocation plan · ${formatMonth(monthStart)}`}
            subtitle="Reserves set aside from received cash"
          />
          <CardBody className="space-y-3">
            {plan.grossReceived === 0 ? (
              <EmptyState
                title="No received income this month"
                description="Record a received payment to see how it is allocated."
              />
            ) : (
              <>
                <Row label="Received income" value={plan.grossReceived} strong />
                <Row label="Business expenses" value={-plan.businessExpenses} />
                <div className="border-t border-slate-100" />
                {plan.steps.map((step) => (
                  <Row
                    key={`${step.category}-${step.value}`}
                    label={`${ALLOCATION_CATEGORY_LABELS[step.category]} (${
                      step.method === "PERCENT" ? `${step.value}%` : `${step.value} ETB`
                    })`}
                    value={step.amount}
                  />
                ))}
                <div className="border-t border-slate-100" />
                <Row label="Total reserved" value={plan.totalReserved} strong />
                <Row label="Personal available" value={plan.personalAvailable} />
                {plan.excessToSavings > 0 ? (
                  <Row label="Excess to savings" value={plan.excessToSavings} />
                ) : null}
                {plan.personalShortfall > 0 ? (
                  <Row
                    label="Allowance shortfall"
                    value={-plan.personalShortfall}
                    strong
                  />
                ) : null}
              </>
            )}
            {plan.warnings.map((w) => (
              <p
                key={w}
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700"
              >
                {w}
              </p>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Savings"
            subtitle={`${formatCurrency(savingsTotal)} across all funds`}
            action={
              <Link href="/finance/savings" className="text-xs font-medium text-brand-700">
                Manage
              </Link>
            }
          />
          <CardBody className="space-y-3">
            {accounts.length === 0 ? (
              <EmptyState title="No savings funds yet" />
            ) : (
              accounts.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-700">
                    {SAVINGS_FUND_LABELS[a.fund as SavingsFundValue]}
                  </span>
                  <span className="text-sm font-medium tabular-nums text-slate-900">
                    {formatCurrency(balances[a.fund as SavingsFundValue] ?? 0)}
                  </span>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Outstanding payments"
          subtitle="Invoiced but not yet received"
          action={
            <Link href="/finance/income" className={buttonClasses("outline", "sm")}>
              Manage income
            </Link>
          }
        />
        <CardBody className="p-0">
          {outstanding.length === 0 ? (
            <div className="p-5">
              <EmptyState title="Nothing outstanding" description="Every invoice is fully paid." />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {outstanding.map(({ entry, amount }) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {entry.description || entry.category}
                    </p>
                    <p className="text-xs text-slate-500">
                      {entry.reference ? `${entry.reference} · ` : ""}
                      {entry.occurredAt ? formatDate(entry.occurredAt) : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone="warning">
                      {PAYMENT_STATUS_LABELS[entry.paymentStatus]}
                    </Badge>
                    <span className="text-sm font-medium tabular-nums text-slate-900">
                      {formatCurrency(amount)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Recent entries"
          action={
            <Link href="/finance/reports" className={buttonClasses("ghost", "sm")}>
              View reports <Icon name="ArrowUpRight" className="h-3.5 w-3.5" />
            </Link>
          }
        />
        <CardBody className="p-0">
          {entries.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No financial entries yet"
                description="Start by recording income or an expense."
                action={
                  <Link href="/finance/income" className={buttonClasses("primary", "sm")}>
                    Record income
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-2 font-medium">Date</th>
                    <th className="px-5 py-2 font-medium">Type</th>
                    <th className="px-5 py-2 font-medium">Category</th>
                    <th className="px-5 py-2 font-medium">Status</th>
                    <th className="px-5 py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.slice(0, 10).map((e) => (
                    <tr key={e.id}>
                      <td className="whitespace-nowrap px-5 py-2 text-slate-600">
                        {e.occurredAt ? formatDate(e.occurredAt) : "—"}
                      </td>
                      <td className="px-5 py-2">
                        <Badge tone={e.type === "INCOME" ? "success" : "danger"}>
                          {e.type === "INCOME" ? "Income" : EXPENSE_CLASS_LABELS[e.expenseClass ?? "BUSINESS"]}
                        </Badge>
                      </td>
                      <td className="px-5 py-2 text-slate-700">{e.category}</td>
                      <td className="px-5 py-2 text-slate-600">
                        {PAYMENT_STATUS_LABELS[e.paymentStatus]}
                      </td>
                      <td className="whitespace-nowrap px-5 py-2 text-right font-medium tabular-nums text-slate-900">
                        {formatCurrency(toNumber(e.amount))}
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

function nextMonth(monthStart: Date): Date {
  return new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));
}

function aggregateSavings(
  accounts: { id: string; fund: string; openingBalance: unknown }[],
  transactions: { fundId: string; type: string; amount: unknown }[],
): Record<SavingsFundValue, number> {
  const balances: Record<SavingsFundValue, number> = {
    GENERAL: 0,
    BUSINESS_STARTUP: 0,
    LONG_TERM_INVESTMENT: 0,
    EMERGENCY: 0,
  };
  const fundById = new Map<string, SavingsFundValue>();
  for (const acc of accounts) {
    balances[acc.fund as SavingsFundValue] =
      (balances[acc.fund as SavingsFundValue] ?? 0) + toNumber(acc.openingBalance);
    fundById.set(acc.id, acc.fund as SavingsFundValue);
  }
  for (const t of transactions) {
    const fund = fundById.get(t.fundId);
    if (!fund) continue;
    const delta = t.type === "CONTRIBUTION" ? toNumber(t.amount) : -toNumber(t.amount);
    balances[fund] = (balances[fund] ?? 0) + delta;
  }
  return balances;
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className={
          strong
            ? "text-sm font-semibold text-slate-800"
            : "text-sm text-slate-600"
        }
      >
        {label}
      </span>
      <span
        className={
          strong
            ? "text-sm font-semibold tabular-nums text-slate-900"
            : "text-sm tabular-nums text-slate-900"
        }
      >
        {formatCurrency(value)}
      </span>
    </div>
  );
}
