import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/datetime";
import { receivedIncome } from "@/lib/finance";
import { PROJECT_STATUS_LABELS } from "@/lib/labels";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Icon } from "@/components/icons";
import type { ProjectStatus } from "@prisma/client";

export const metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<
  ProjectStatus,
  "neutral" | "info" | "warning" | "success" | "danger" | "muted"
> = {
  PLANNED: "neutral",
  ACTIVE: "info",
  ON_HOLD: "warning",
  COMPLETED: "success",
  CANCELLED: "muted",
};

export default async function ProjectsPage() {
  const user = await requireUser();

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { id: true, name: true } },
      lead: { select: { id: true, name: true } },
      financeEntries: {
        where: { type: "INCOME" },
        select: {
          type: true,
          amount: true,
          amountReceived: true,
          paymentStatus: true,
        },
      },
    },
  });

  const rows = projects.map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    budget: toNumber(p.budget),
    revenue: receivedIncome(p.financeEntries),
    clientName: p.client?.name ?? null,
    clientId: p.client?.id ?? null,
    leadName: p.lead?.name ?? null,
    leadId: p.lead?.id ?? null,
    startDate: p.startDate,
    endDate: p.endDate,
  }));

  const totalRevenue = rows.reduce((s, p) => s + p.revenue, 0);
  const totalBudget = rows.reduce((s, p) => s + p.budget, 0);
  const activeCount = rows.filter((p) => p.status === "ACTIVE").length;
  const completedCount = rows.filter((p) => p.status === "COMPLETED").length;

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Client and internal projects with budgets and recorded revenue."
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Projects"
          value={rows.length}
          hint={`${activeCount} active`}
          icon={<Icon name="FolderKanban" className="h-4 w-4" />}
        />
        <StatCard label="Completed" value={completedCount} tone="success" />
        <StatCard
          label="Total budget"
          value={formatCurrency(totalBudget, user.currency)}
        />
        <StatCard
          label="Received revenue"
          value={formatCurrency(totalRevenue, user.currency)}
          tone="brand"
        />
      </section>

      <section className="mt-6">
        <Card>
          <CardHeader
            title="All projects"
            subtitle={`${rows.length} total`}
          />
          <CardBody className="p-0 sm:p-0">
            {rows.length === 0 ? (
              <div className="p-4 sm:p-5">
                <EmptyState
                  icon={<Icon name="FolderKanban" className="h-6 w-6" />}
                  title="No projects yet"
                  description="Projects are created when a won lead is converted to a client, or added from the client record."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[48rem] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                      <th className="px-4 py-3 font-medium sm:px-5">Project</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Client</th>
                      <th className="px-4 py-3 text-right font-medium">
                        Budget
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Received
                      </th>
                      <th className="px-4 py-3 text-right font-medium sm:px-5">
                        Timeline
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60"
                      >
                        <td className="px-4 py-3 sm:px-5">
                          <Link
                            href={`/projects/${p.id}`}
                            className="font-medium text-slate-800 hover:text-brand-700 hover:underline"
                          >
                            {p.name}
                          </Link>
                          {p.leadName ? (
                            <p className="text-xs text-slate-400">
                              From lead:{" "}
                              <a
                                href={`/commercial/leads/${p.leadId}`}
                                className="text-brand-700 hover:underline"
                              >
                                {p.leadName}
                              </a>
                            </p>
                          ) : null}
                          {p.budget > 0 ? (
                            <div className="mt-1 w-32">
                              <ProgressBar
                                value={p.revenue}
                                max={p.budget}
                                tone={p.revenue >= p.budget ? "success" : "brand"}
                              />
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={STATUS_TONE[p.status]}>
                            {PROJECT_STATUS_LABELS[p.status]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {p.clientName ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                          {p.budget > 0
                            ? formatCurrency(p.budget, user.currency)
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                          {formatCurrency(p.revenue, user.currency)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500">
                          {p.startDate || p.endDate
                            ? `${p.startDate ? formatDate(p.startDate, "MMM d, yyyy") : "—"} → ${
                                p.endDate
                                  ? formatDate(p.endDate, "MMM d, yyyy")
                                  : "—"
                              }`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
