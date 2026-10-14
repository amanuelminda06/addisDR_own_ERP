import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/datetime";
import { toNumber } from "@/lib/utils";
import { getFinanceLookups } from "@/lib/finance-queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { ExpenseForm } from "@/components/finance/ExpenseForm";

export const metadata = { title: "Edit expense · Finance" };
export const dynamic = "force-dynamic";

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const [entry, { projects }] = await Promise.all([
    prisma.financeEntry.findUnique({ where: { id } }),
    getFinanceLookups(),
  ]);
  if (!entry || entry.type !== "EXPENSE") notFound();

  return (
    <div className="space-y-6">
      <PageHeader title="Edit expense" description={entry.category} />
      <Card>
        <CardBody>
          <ExpenseForm
            mode="edit"
            projects={projects}
            defaults={{
              id: entry.id,
              category: entry.category,
              amount: toNumber(entry.amount).toFixed(2),
              occurredAt: entry.occurredAt
                ? formatDate(entry.occurredAt, "yyyy-MM-dd")
                : "",
              expenseClass: entry.expenseClass ?? "BUSINESS",
              paymentMethod: entry.paymentMethod ?? "",
              projectId: entry.projectId ?? "",
              reference: entry.reference ?? "",
              description: entry.description ?? "",
              notes: entry.notes ?? "",
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
