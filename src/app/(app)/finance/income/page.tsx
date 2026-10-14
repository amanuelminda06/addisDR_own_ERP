import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/datetime";
import {
  entryOutstanding,
  entryReceived,
  receivedIncome,
  summarizeFinance,
} from "@/lib/finance";
import { PAYMENT_STATUS_LABELS } from "@/lib/labels";
import {
  financeEntrySelect,
  getFinanceLookups,
} from "@/lib/finance-queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/Button";
import { IncomeForm } from "@/components/finance/IncomeForm";
import { IncomeEntryActions } from "@/components/finance/IncomeEntryActions";

export const metadata = { title: "Income" };
export const dynamic = "force-dynamic";

export default async function IncomePage() {
  const user = await requireUser();
  const [{ projects, clients }, entries] = await Promise.all([
    getFinanceLookups(),
    prisma.financeEntry.findMany({
      where: { type: "INCOME" },
      select: financeEntrySelect,
      orderBy: { occurredAt: "desc" },
    }),
  ]);

  const summary = summarizeFinance(entries);
  const today = new Date().toISOString().slice(0, 10);
  const projectById = new Map(projects.map((p) => [p.id, p.name]));
  const clientById = new Map(clients.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Income"
        description="Record payments and track what is invoiced, received and outstanding."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Received"
          value={formatCurrency(receivedIncome(entries), user.currency)}
          tone="success"
        />
        <StatCard
          label="Invoiced"
          value={formatCurrency(summary.invoicedAmount, user.currency)}
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(summary.outstandingPayments, user.currency)}
          tone={summary.outstandingPayments > 0 ? "warning" : "default"}
        />
      </div>

      <Card>
        <CardHeader title="Record income" subtitle="Duplicate references are rejected automatically" />
        <CardBody>
          <IncomeForm
            mode="create"
            projects={projects}
            clients={clients}
            defaults={{
              id: "",
              category: "",
              amount: "",
              occurredAt: today,
              paymentStatus: "RECEIVED",
              amountReceived: "",
              paymentMethod: "",
              projectId: "",
              clientId: "",
              reference: "",
              dueDate: "",
              description: "",
              notes: "",
            }}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Income entries" subtitle={`${entries.length} entries`} />
        <CardBody className="p-0">
          {entries.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No income recorded"
                description="Use the form above to record your first payment."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-2 font-medium">Date</th>
                    <th className="px-5 py-2 font-medium">Category</th>
                    <th className="px-5 py-2 font-medium">Project / client</th>
                    <th className="px-5 py-2 font-medium">Status</th>
                    <th className="px-5 py-2 text-right font-medium">Amount</th>
                    <th className="px-5 py-2 text-right font-medium">Received</th>
                    <th className="px-5 py-2 text-right font-medium">Outstanding</th>
                    <th className="px-5 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map((e) => (
                    <tr key={e.id}>
                      <td className="whitespace-nowrap px-5 py-2 text-slate-600">
                        {e.occurredAt ? formatDate(e.occurredAt) : "—"}
                      </td>
                      <td className="px-5 py-2 text-slate-700">
                        {e.category}
                        {e.reference ? (
                          <span className="block text-xs text-slate-400">
                            {e.reference}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-5 py-2 text-slate-600">
                        {e.projectId ? projectById.get(e.projectId) ?? "—" : "—"}
                        {e.clientId ? (
                          <span className="block text-xs text-slate-400">
                            {clientById.get(e.clientId)}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-5 py-2">
                        <Badge tone={statusTone(e.paymentStatus)}>
                          {PAYMENT_STATUS_LABELS[e.paymentStatus]}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-5 py-2 text-right tabular-nums text-slate-900">
                        {formatCurrency(toNumber(e.amount))}
                      </td>
                      <td className="whitespace-nowrap px-5 py-2 text-right tabular-nums text-emerald-700">
                        {formatCurrency(entryReceived(e))}
                      </td>
                      <td className="whitespace-nowrap px-5 py-2 text-right tabular-nums text-amber-700">
                        {formatCurrency(entryOutstanding(e))}
                      </td>
                      <td className="px-5 py-2">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/finance/income/${e.id}/edit`}
                            className={buttonClasses("ghost", "sm")}
                          >
                            Edit
                          </Link>
                          <IncomeEntryActions
                            entryId={e.id}
                            canMarkReceived={
                              e.paymentStatus !== "RECEIVED" &&
                              e.paymentStatus !== "CANCELLED"
                            }
                          />
                        </div>
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

function statusTone(status: string) {
  switch (status) {
    case "RECEIVED":
      return "success" as const;
    case "PARTIAL":
      return "info" as const;
    case "INVOICED":
      return "warning" as const;
    case "PROJECTED":
      return "muted" as const;
    default:
      return "danger" as const;
  }
}
