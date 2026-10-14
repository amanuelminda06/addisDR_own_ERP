import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/datetime";
import { businessExpenses, expensesTotal, personalExpenses } from "@/lib/finance";
import { EXPENSE_CLASS_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/labels";
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
import { ExpenseForm } from "@/components/finance/ExpenseForm";
import { ExpenseEntryActions } from "@/components/finance/ExpenseEntryActions";

export const metadata = { title: "Expenses" };
export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const user = await requireUser();
  const [{ projects }, entries] = await Promise.all([
    getFinanceLookups(),
    prisma.financeEntry.findMany({
      where: { type: "EXPENSE" },
      select: financeEntrySelect,
      orderBy: { occurredAt: "desc" },
    }),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const projectById = new Map(projects.map((p) => [p.id, p.name]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Separate business costs from personal spending. Only business costs reduce net profit."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Business expenses"
          value={formatCurrency(businessExpenses(entries), user.currency)}
          tone="danger"
        />
        <StatCard
          label="Personal expenses"
          value={formatCurrency(personalExpenses(entries), user.currency)}
          hint="Distributions, not business costs"
        />
        <StatCard
          label="Total expenses"
          value={formatCurrency(expensesTotal(entries), user.currency)}
        />
      </div>

      <Card>
        <CardHeader title="Record expense" />
        <CardBody>
          <ExpenseForm
            mode="create"
            projects={projects}
            defaults={{
              id: "",
              category: "",
              amount: "",
              occurredAt: today,
              expenseClass: "BUSINESS",
              paymentMethod: "",
              projectId: "",
              reference: "",
              description: "",
              notes: "",
            }}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Expense entries" subtitle={`${entries.length} entries`} />
        <CardBody className="p-0">
          {entries.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No expenses recorded"
                description="Use the form above to record a cost."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-2 font-medium">Date</th>
                    <th className="px-5 py-2 font-medium">Category</th>
                    <th className="px-5 py-2 font-medium">Project</th>
                    <th className="px-5 py-2 font-medium">Method</th>
                    <th className="px-5 py-2 text-right font-medium">Amount</th>
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
                        <Badge
                          tone={e.expenseClass === "PERSONAL" ? "warning" : "brand"}
                          className="ml-2"
                        >
                          {EXPENSE_CLASS_LABELS[e.expenseClass ?? "BUSINESS"]}
                        </Badge>
                      </td>
                      <td className="px-5 py-2 text-slate-600">
                        {e.projectId ? projectById.get(e.projectId) ?? "—" : "—"}
                      </td>
                      <td className="px-5 py-2 text-slate-600">
                        {e.paymentMethod ? PAYMENT_METHOD_LABELS[e.paymentMethod] : "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-2 text-right font-medium tabular-nums text-slate-900">
                        {formatCurrency(toNumber(e.amount))}
                      </td>
                      <td className="px-5 py-2">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/finance/expenses/${e.id}/edit`}
                            className={buttonClasses("ghost", "sm")}
                          >
                            Edit
                          </Link>
                          <ExpenseEntryActions entryId={e.id} />
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
