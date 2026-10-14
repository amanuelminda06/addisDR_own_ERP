import { toNumber } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/datetime";
import { prisma } from "@/lib/prisma";
import { getFinanceLookups } from "@/lib/finance-queries";
import { deleteBusinessInvestmentAction } from "@/lib/actions/finance";
import {
  INVESTMENT_DECISION_LABELS,
  INVESTMENT_STATUS_LABELS,
} from "@/lib/labels";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { BusinessInvestmentForm } from "@/components/finance/BusinessInvestmentForm";
import { InvestmentActions } from "@/components/finance/InvestmentActions";
import { ConfirmDeleteButton } from "@/components/finance/ConfirmDeleteButton";

export const metadata = { title: "Investments" };
export const dynamic = "force-dynamic";

export default async function InvestmentsPage() {
  const user = await requireUser();
  const [{ projects }, investments] = await Promise.all([
    getFinanceLookups(),
    prisma.businessInvestment.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const projectById = new Map(projects.map((p) => [p.id, p.name]));
  const pending = investments.filter((i) => i.decision === "PENDING");
  const plannedTotal = investments.reduce((s, i) => s + toNumber(i.plannedAmount), 0);
  const spentTotal = investments.reduce((s, i) => s + toNumber(i.actualAmount), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business investments"
        description="Plan, decide and record money put back into growing the business."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Pending decisions" value={pending.length} tone={pending.length > 0 ? "warning" : "default"} />
        <StatCard label="Planned total" value={formatCurrency(plannedTotal, user.currency)} />
        <StatCard label="Spent total" value={formatCurrency(spentTotal, user.currency)} tone="brand" />
      </div>

      <Card>
        <CardHeader title="Plan an investment" />
        <CardBody>
          <BusinessInvestmentForm projects={projects} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Investments" subtitle={`${investments.length} entries`} />
        <CardBody className="p-0">
          {investments.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No investments yet"
                description="Plan an investment above to see it here."
              />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {investments.map((inv) => (
                <li key={inv.id} className="space-y-3 px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">
                        {inv.purpose}
                      </p>
                      <p className="text-xs text-slate-500">
                        {inv.projectId
                          ? `Project: ${projectById.get(inv.projectId) ?? "—"} · `
                          : ""}
                        Planned {formatCurrency(toNumber(inv.plannedAmount))}
                        {inv.actualAmount
                          ? ` · Spent ${formatCurrency(toNumber(inv.actualAmount))}`
                          : ""}
                      </p>
                      {inv.expectedBenefit ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Expected: {inv.expectedBenefit}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={decisionTone(inv.decision)}>
                        {INVESTMENT_DECISION_LABELS[inv.decision as keyof typeof INVESTMENT_DECISION_LABELS]}
                      </Badge>
                      <Badge tone="muted">
                        {INVESTMENT_STATUS_LABELS[inv.status as keyof typeof INVESTMENT_STATUS_LABELS]}
                      </Badge>
                    </div>
                  </div>

                  {inv.spendDate ? (
                    <p className="text-xs text-slate-400">
                      Spent on {formatDate(inv.spendDate)}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <InvestmentActions
                      investmentId={inv.id}
                      decision={inv.decision}
                      hasExpense={Boolean(inv.expenseId)}
                    />
                    <ConfirmDeleteButton
                      id={inv.id}
                      action={deleteBusinessInvestmentAction}
                      message="Delete this investment plan?"
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

function decisionTone(decision: string) {
  switch (decision) {
    case "APPROVED":
      return "success" as const;
    case "REJECTED":
      return "danger" as const;
    default:
      return "warning" as const;
  }
}
