import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { requireUser } from "@/lib/auth";
import { addMonths, startOfMonth, zonedNow } from "@/lib/datetime";
import {
  allowanceAdjustmentForMonth,
  computeFinancialPlan,
  summarizeFinance,
} from "@/lib/finance";
import { ALLOCATION_CATEGORY_LABELS } from "@/lib/labels";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { AllocationRuleForm } from "@/components/finance/AllocationRuleForm";

export const metadata = { title: "Allocation rules · Finance" };
export const dynamic = "force-dynamic";

export default async function AllocationsPage() {
  const user = await requireUser();
  const monthStart = startOfMonth(zonedNow());

  const [rules, entries, adjustments] = await Promise.all([
    prisma.financialAllocation.findMany({ orderBy: { sequence: "asc" } }),
    prisma.financeEntry.findMany({
      where: { occurredAt: { gte: monthStart, lt: addMonths(monthStart, 1) } },
      select: {
        type: true,
        amount: true,
        amountReceived: true,
        paymentStatus: true,
        expenseClass: true,
        category: true,
        occurredAt: true,
      },
    }),
    prisma.allowanceAdjustment.findMany(),
  ]);

  const ruleByCategory = new Map(rules.map((r) => [r.category, r]));
  const summary = summarizeFinance(entries);
  const allowanceTarget = Math.max(
    toNumber(user.monthlyAllowance) - allowanceAdjustmentForMonth(adjustments, startOfMonth(zonedNow())),
    0,
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Allocation rules"
        description="How received income is split into tax, tithe, savings and business reserves before personal spending."
      />

      <Card>
        <CardHeader
          title="This month's reserves"
          subtitle={`Based on ${formatCurrency(summary.receivedIncome, user.currency)} received`}
        />
        <CardBody className="space-y-2">
          <ReserveRow label="Tax" value={plan.tax} />
          <ReserveRow label="Tithe" value={plan.tithe} />
          <ReserveRow label="Savings" value={plan.savings} />
          <ReserveRow label="Business reserve" value={plan.businessReserve} />
          {plan.otherReserve > 0 ? (
            <ReserveRow label="Other" value={plan.otherReserve} />
          ) : null}
          <div className="border-t border-slate-100 pt-2">
            <ReserveRow label="Total reserved" value={plan.totalReserved} strong />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Rules"
          subtitle="Rules apply to future income only — past entries keep the allocations they were recorded with."
        />
        <CardBody className="space-y-4">
          {ALLOCATIONS_ORDER.map((category) => {
            const rule = ruleByCategory.get(category);
            return (
              <div
                key={category}
                className="rounded-lg border border-slate-100 p-3"
              >
                <AllocationRuleForm
                  defaults={{
                    category,
                    categoryLabel: ALLOCATION_CATEGORY_LABELS[category],
                    method: rule?.method ?? "PERCENT",
                    value: rule ? String(toNumber(rule.value)) : "0",
                    basis: rule?.basis ?? "GROSS",
                    sequence: String(rule?.sequence ?? 0),
                    isActive: rule?.isActive ?? true,
                  }}
                />
              </div>
            );
          })}
        </CardBody>
      </Card>
    </div>
  );
}

const ALLOCATIONS_ORDER = [
  "TAX",
  "TITHE",
  "SAVINGS",
  "BUSINESS",
  "PERSONAL",
  "OTHER",
] as const;

function ReserveRow({
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
          strong ? "text-sm font-semibold text-slate-800" : "text-sm text-slate-600"
        }
      >
        {label}
      </span>
      <span className="text-sm font-medium tabular-nums text-slate-900">
        {formatCurrency(value)}
      </span>
    </div>
  );
}
