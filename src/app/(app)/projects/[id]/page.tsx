import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/datetime";
import { projectFinancialSummary } from "@/lib/finance";
import {
  EXPENSE_CLASS_LABELS,
  INVESTMENT_DECISION_LABELS,
  PAYMENT_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
} from "@/lib/labels";
import { financeEntrySelect } from "@/lib/finance-queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const [project, entries, investments] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: { client: { select: { id: true, name: true } } },
    }),
    prisma.financeEntry.findMany({
      where: { projectId: id },
      select: financeEntrySelect,
      orderBy: { occurredAt: "desc" },
    }),
    prisma.businessInvestment.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  if (!project) notFound();

  const summary = projectFinancialSummary(project, entries);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/projects" className="text-xs text-slate-500 hover:underline">
          ← Projects
        </Link>
      </div>
      <PageHeader
        title={project.name}
        description={project.client ? `Client: ${project.client.name}` : undefined}
        action={
          <div className="flex items-center gap-2">
            <Badge tone="info">{PROJECT_STATUS_LABELS[project.status]}</Badge>
            <Link href="/finance/income" className={buttonClasses("outline", "sm")}>
              Record income
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Agreed value"
          value={formatCurrency(summary.agreedValue, "ETB")}
        />
        <StatCard
          label="Received"
          value={formatCurrency(summary.received)}
          tone="success"
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(summary.outstanding)}
          tone={summary.outstanding > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Net profit"
          value={formatCurrency(summary.netProfit)}
          tone={summary.netProfit >= 0 ? "brand" : "danger"}
        />
      </div>

      {summary.agreedValue > 0 ? (
        <Card>
          <CardBody>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-slate-600">
                Received {Math.round((summary.received / summary.agreedValue) * 100)}% of agreed value
              </span>
              <span className="text-slate-500">
                {formatCurrency(summary.received)} / {formatCurrency(summary.agreedValue)}
              </span>
            </div>
            <ProgressBar
              value={summary.received}
              max={summary.agreedValue}
              tone={summary.overAgreed ? "danger" : summary.received >= summary.agreedValue ? "success" : "brand"}
            />
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Project entries" subtitle={`${entries.length} entries`} />
        <CardBody className="p-0">
          {entries.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No financial entries"
                description="Record income or expenses against this project."
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
                  {entries.map((e) => (
                    <tr key={e.id}>
                      <td className="whitespace-nowrap px-5 py-2 text-slate-600">
                        {e.occurredAt ? formatDate(e.occurredAt) : "—"}
                      </td>
                      <td className="px-5 py-2">
                        <Badge tone={e.type === "INCOME" ? "success" : "danger"}>
                          {e.type === "INCOME"
                            ? "Income"
                            : EXPENSE_CLASS_LABELS[e.expenseClass ?? "BUSINESS"]}
                        </Badge>
                      </td>
                      <td className="px-5 py-2 text-slate-700">{e.category}</td>
                      <td className="px-5 py-2 text-slate-600">
                        {PAYMENT_STATUS_LABELS[e.paymentStatus]}
                      </td>
                      <td className="whitespace-nowrap px-5 py-2 text-right tabular-nums text-slate-900">
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

      <Card>
        <CardHeader title="Investments" subtitle="Planned and spent on this project" />
        <CardBody className="p-0">
          {investments.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No investments linked" />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {investments.map((inv) => (
                <li
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {inv.purpose}
                    </p>
                    {inv.expectedBenefit ? (
                      <p className="text-xs text-slate-500">{inv.expectedBenefit}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone="muted">
                      {INVESTMENT_DECISION_LABELS[inv.decision]}
                    </Badge>
                    <span className="text-sm font-medium tabular-nums text-slate-900">
                      {formatCurrency(toNumber(inv.plannedAmount))}
                    </span>
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
