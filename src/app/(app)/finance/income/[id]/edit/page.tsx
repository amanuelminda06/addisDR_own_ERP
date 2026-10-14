import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/datetime";
import { toNumber } from "@/lib/utils";
import { getFinanceLookups } from "@/lib/finance-queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { IncomeForm } from "@/components/finance/IncomeForm";

export const metadata = { title: "Edit income · Finance" };
export const dynamic = "force-dynamic";

export default async function EditIncomePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const [entry, { projects, clients }] = await Promise.all([
    prisma.financeEntry.findUnique({ where: { id } }),
    getFinanceLookups(),
  ]);
  if (!entry || entry.type !== "INCOME") notFound();

  return (
    <div className="space-y-6">
      <PageHeader title="Edit income" description={entry.category} />
      <Card>
        <CardBody>
          <IncomeForm
            mode="edit"
            projects={projects}
            clients={clients}
            defaults={{
              id: entry.id,
              category: entry.category,
              amount: toNumber(entry.amount).toFixed(2),
              occurredAt: entry.occurredAt
                ? formatDate(entry.occurredAt, "yyyy-MM-dd")
                : "",
              paymentStatus: entry.paymentStatus,
              amountReceived:
                entry.amountReceived != null
                  ? toNumber(entry.amountReceived).toFixed(2)
                  : "",
              paymentMethod: entry.paymentMethod ?? "",
              projectId: entry.projectId ?? "",
              clientId: entry.clientId ?? "",
              reference: entry.reference ?? "",
              dueDate: entry.dueDate
                ? formatDate(entry.dueDate, "yyyy-MM-dd")
                : "",
              description: entry.description ?? "",
              notes: entry.notes ?? "",
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
