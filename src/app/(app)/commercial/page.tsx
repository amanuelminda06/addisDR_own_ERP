import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { formatCurrency, formatPercent } from "@/lib/currency";
import { formatDate, zonedNow } from "@/lib/datetime";
import { LEAD_PRIORITY_LABELS, LEAD_STATUS_LABELS } from "@/lib/labels";
import {
  isLeadStale,
  summarizePipeline,
  type LeadStatusValue,
  type LeadPriorityValue,
} from "@/lib/commercial";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/icons";
import { buttonClasses } from "@/components/ui/Button";
import {
  PipelineBoard,
  type BoardLead,
} from "@/components/commercial/PipelineBoard";

export const metadata = { title: "Commercial" };
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<
  LeadStatusValue,
  "neutral" | "info" | "warning" | "success" | "danger" | "brand"
> = {
  NEW: "neutral",
  CONTACTED: "info",
  QUALIFIED: "brand",
  PROPOSAL: "warning",
  NEGOTIATION: "warning",
  WON: "success",
  LOST: "danger",
};

const PRIORITY_TONE: Record<
  LeadPriorityValue,
  "muted" | "neutral" | "warning" | "danger"
> = { LOW: "muted", MEDIUM: "neutral", HIGH: "warning", URGENT: "danger" };

export default async function CommercialPage() {
  const user = await requireUser();
  const now = zonedNow();

  const [leads, clients, activityCount] = await Promise.all([
    prisma.lead.findMany({
      orderBy: { updatedAt: "desc" },
      include: { marketingActivity: { select: { name: true } } },
    }),
    prisma.client.count(),
    prisma.marketingActivity.count(),
  ]);

  const summary = summarizePipeline(leads);

  const boardLeads: BoardLead[] = leads
    .filter((l) => l.status !== "WON" && l.status !== "LOST")
    .map((l) => ({
      id: l.id,
      name: l.name,
      company: l.company,
      status: l.status as LeadStatusValue,
      priority: l.priority as LeadPriorityValue,
      estimatedValue: toNumber(l.estimatedValue),
      probability: l.probability ?? 0,
      nextFollowUpLabel: l.nextFollowUpAt
        ? formatDate(l.nextFollowUpAt, "MMM d")
        : null,
      stale: isLeadStale(l.lastContactedAt, now),
    }));

  return (
    <div>
      <PageHeader
        title="Commercial"
        description="Leads, sales pipeline, clients and communication milestones."
        action={
          <Link href="/commercial/leads/new" className={buttonClasses("primary")}>
            <Icon name="Plus" className="h-4 w-4" />
            New lead
          </Link>
        }
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Pipeline value"
          value={formatCurrency(summary.pipelineValue, user.currency)}
          hint={`${summary.open} open leads`}
          icon={<Icon name="Briefcase" className="h-4 w-4" />}
        />
        <StatCard
          label="Weighted pipeline"
          value={formatCurrency(summary.weightedPipeline, user.currency)}
          hint="Probability adjusted"
          tone="brand"
        />
        <StatCard
          label="Win rate"
          value={formatPercent(summary.winRate)}
          hint={`${summary.won} won · ${summary.lost} lost`}
          tone="success"
        />
        <StatCard
          label="Won value"
          value={formatCurrency(summary.wonValue, user.currency)}
          hint={`Avg deal ${formatCurrency(summary.averageDealSize, user.currency)}`}
          tone="success"
        />
      </section>

      <section className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total leads" value={summary.total} />
        <StatCard label="Open leads" value={summary.open} />
        <StatCard label="Clients" value={clients} />
        <StatCard label="Marketing activities" value={activityCount} />
      </section>

      <section className="mt-6">
        <Card>
          <CardHeader
            title="Sales pipeline"
            subtitle={`${summary.open} open opportunities`}
          />
          <CardBody>
            <PipelineBoard leads={boardLeads} currency={user.currency} />
          </CardBody>
        </Card>
      </section>

      <section className="mt-4">
        <Card>
          <CardHeader
            title="All leads"
            subtitle={`${summary.total} total · ${summary.won} won · ${summary.lost} lost`}
          />
          <CardBody className="p-0 sm:p-0">
            {leads.length === 0 ? (
              <div className="p-4 sm:p-5">
                <EmptyState
                  icon={<Icon name="Users" className="h-6 w-6" />}
                  title="No leads yet"
                  description="Capture your first lead to start building the pipeline."
                  action={
                    <Link
                      href="/commercial/leads/new"
                      className={buttonClasses("primary", "sm")}
                    >
                      New lead
                    </Link>
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[44rem] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                      <th className="px-4 py-3 font-medium sm:px-5">Lead</th>
                      <th className="px-4 py-3 font-medium">Stage</th>
                      <th className="px-4 py-3 font-medium">Priority</th>
                      <th className="px-4 py-3 text-right font-medium">Value</th>
                      <th className="px-4 py-3 text-right font-medium">
                        Expected close
                      </th>
                      <th className="px-4 py-3 text-right font-medium sm:px-5">
                        Next follow-up
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((l) => {
                      const status = l.status as LeadStatusValue;
                      return (
                        <tr
                          key={l.id}
                          className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60"
                        >
                          <td className="px-4 py-3 sm:px-5">
                            <Link
                              href={`/commercial/leads/${l.id}`}
                              className="font-medium text-slate-800 hover:text-brand-700 hover:underline"
                            >
                              {l.name}
                            </Link>
                            {l.company || l.marketingActivity ? (
                              <p className="text-xs text-slate-400">
                                {l.company ?? "—"}
                                {l.marketingActivity
                                  ? ` · ${l.marketingActivity.name}`
                                  : ""}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone={STATUS_TONE[status]}>
                              {LEAD_STATUS_LABELS[status]}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              tone={
                                PRIORITY_TONE[l.priority as LeadPriorityValue]
                              }
                            >
                              {LEAD_PRIORITY_LABELS[l.priority as LeadPriorityValue]}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                            {formatCurrency(l.estimatedValue, user.currency)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500">
                            {l.expectedCloseAt
                              ? formatDate(l.expectedCloseAt, "MMM d, yyyy")
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500 sm:px-5">
                            {l.nextFollowUpAt
                              ? formatDate(l.nextFollowUpAt, "MMM d")
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
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
