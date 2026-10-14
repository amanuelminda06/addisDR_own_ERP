import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/datetime";
import {
  projectFinancialSummary,
  summarizeProjectCollection,
} from "@/lib/finance";
import {
  EXPENSE_CLASS_LABELS,
  INVESTMENT_DECISION_LABELS,
  PAYMENT_METHOD_LABELS,
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
import { ProjectPaymentForm } from "@/components/projects/ProjectPaymentForm";
import {
  CollectionScheduleCreateForm,
  CollectionScheduleEditForm,
} from "@/components/projects/CollectionScheduleForm";
import { deleteProjectPaymentAction, updateProjectAgreedPriceFormAction } from "@/lib/actions/projects";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const [project, entries, payments, schedules, investments] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: { client: { select: { id: true, name: true } } },
    }),
    prisma.financeEntry.findMany({
      where: { projectId: id },
      select: financeEntrySelect,
      orderBy: { occurredAt: "desc" },
    }),
    prisma.projectPayment.findMany({
      where: { projectId: id },
      orderBy: { receivedAt: "desc" },
    }),
    prisma.collectionSchedule.findMany({
      where: { projectId: id },
      orderBy: { expectedDate: "asc" },
    }),
    prisma.businessInvestment.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  if (!project) notFound();

  const summary = projectFinancialSummary(project, entries);
  const collection = summarizeProjectCollection(project, payments, schedules);

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
          value={formatCurrency(collection.agreedValue, "ETB")}
        />
        <StatCard
          label="Total collected"
          value={formatCurrency(collection.totalCollected, "ETB")}
          tone="success"
        />
        <StatCard
          label="Outstanding balance"
          value={formatCurrency(collection.outstandingBalance, "ETB")}
          tone={collection.outstandingBalance > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Net profit"
          value={formatCurrency(summary.netProfit)}
          tone={summary.netProfit >= 0 ? "brand" : "danger"}
        />
      </div>

      {collection.agreedValue > 0 ? (
        <Card>
          <CardBody>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-slate-600">
                Collected {Math.round(collection.collectedPct * 100)}%
                {collection.isOverpaid ? " (overpaid)" : ""}
              </span>
              <span className="text-slate-500">
                {formatCurrency(collection.totalCollected)} / {formatCurrency(collection.agreedValue)}
              </span>
            </div>
            <ProgressBar
              value={Math.min(collection.totalCollected, collection.agreedValue)}
              max={collection.agreedValue}
              tone={
                collection.isOverpaid
                  ? "danger"
                  : collection.isFullyPaid
                    ? "success"
                    : "brand"
              }
            />
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Agreed price" subtitle="Total price for this project in ETB" />
          <CardBody>
            <form action={updateProjectAgreedPriceFormAction} className="space-y-3">
              <input type="hidden" name="id" value={project.id} />
              <div>
                <label className="field-label">Total agreed price (ETB)</label>
                <input
                  name="agreedPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={toNumber(project.agreedPrice ?? project.budget)}
                  className="field-input"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
              >
                Update agreed price
              </button>
            </form>
            {collection.remainingMilestones > 0 ? (
              <p className="mt-3 text-xs text-slate-500">
                {collection.remainingMilestones} pending installment
                {collection.remainingMilestones === 1 ? "" : "s"}
                {collection.overdueMilestones > 0
                  ? ` · ${collection.overdueMilestones} overdue`
                  : ""}
                .
              </p>
            ) : null}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Record partial payment" subtitle="Each payment creates one finance entry." />
          <CardBody>
            <ProjectPaymentForm
              projectId={project.id}
              milestones={schedules
                .filter((s) => s.status !== "RECEIVED" && s.status !== "CANCELLED")
                .map((s) => ({ id: s.id, label: s.label }))}
            />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Payments received"
          subtitle={`${payments.length} confirmed payment${payments.length === 1 ? "" : "s"}`}
        />
        <CardBody className="p-0">
          {payments.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No payments recorded"
                description="Record an advance, partial, or final payment above."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-2 font-medium">Date</th>
                    <th className="px-5 py-2 font-medium">Method</th>
                    <th className="px-5 py-2 font-medium">Reference</th>
                    <th className="px-5 py-2 text-right font-medium">Amount</th>
                    <th className="px-5 py-2 font-medium">Notes</th>
                    <th className="px-5 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="whitespace-nowrap px-5 py-2 text-slate-600">
                        {formatDate(p.receivedAt)}
                      </td>
                      <td className="px-5 py-2 text-slate-700">
                        {p.paymentMethod ? PAYMENT_METHOD_LABELS[p.paymentMethod] : "—"}
                      </td>
                      <td className="px-5 py-2 text-slate-600">{p.reference ?? "—"}</td>
                      <td className="whitespace-nowrap px-5 py-2 text-right tabular-nums text-emerald-700">
                        {formatCurrency(toNumber(p.amount))}
                      </td>
                      <td className="px-5 py-2 text-slate-500">{p.notes ?? "—"}</td>
                      <td className="px-5 py-2 text-right">
                        <form action={deleteProjectPaymentAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <button
                            type="submit"
                            className="rounded-lg border border-red-200 bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </form>
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
        <CardHeader
          title="Expected payments / installments"
          subtitle="Optional schedule with no milestones supported."
        />
        <CardBody className="space-y-4">
          <CollectionScheduleCreateForm projectId={project.id} />
          {schedules.length === 0 ? (
            <p className="text-sm text-slate-500">
              No expected payment dates recorded. Add one above or leave without a fixed schedule.
            </p>
          ) : (
            <div className="space-y-3">
              {schedules.map((s) => (
                <CollectionScheduleEditForm
                  key={s.id}
                  schedule={{
                    id: s.id,
                    label: s.label,
                    expectedAmount: toNumber(s.expectedAmount).toFixed(2),
                    expectedDate: s.expectedDate.toISOString().slice(0, 10),
                    status: s.status,
                    notes: s.notes,
                  }}
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

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
