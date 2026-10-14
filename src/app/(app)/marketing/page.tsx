import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { formatCurrency, formatPercent } from "@/lib/currency";
import { formatDate } from "@/lib/datetime";
import { MARKETING_CHANNEL_LABELS } from "@/lib/labels";
import {
  attributionRate,
  channelBreakdown,
  costPerLead,
  type MarketingChannelValue,
} from "@/lib/commercial";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Icon } from "@/components/icons";
import {
  MarketingActivityForm,
  type MarketingDefaults,
} from "@/components/marketing/MarketingActivityForm";
import {
  MarketingActivityList,
  type MarketingActivityRow,
} from "@/components/marketing/MarketingActivityList";

export const metadata = { title: "Marketing" };
export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  const user = await requireUser();

  const [activities, leads] = await Promise.all([
    prisma.marketingActivity.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.lead.findMany({
      select: {
        status: true,
        estimatedValue: true,
        marketingActivityId: true,
      },
    }),
  ]);

  const attributedLeads = leads.filter((l) => l.marketingActivityId);
  const breakdown = channelBreakdown(
    activities.map((a) => ({
      id: a.id,
      channel: a.channel,
      budget: a.budget,
      spend: a.spend,
    })),
    leads,
  ).sort((a, b) => b.spend - a.spend || b.leads - a.leads);

  const totalBudget = activities.reduce((s, a) => s + toNumber(a.budget), 0);
  const totalSpend = activities.reduce((s, a) => s + toNumber(a.spend), 0);
  const activeCount = activities.filter((a) => a.status === "ACTIVE").length;
  const overallCostPerLead = costPerLead(totalSpend, attributedLeads.length);

  const rows: MarketingActivityRow[] = activities.map((a) => {
    const leadCount = leads.filter(
      (l) => l.marketingActivityId === a.id,
    ).length;
    const defaults: MarketingDefaults = {
      id: a.id,
      name: a.name,
      channel: a.channel,
      status: a.status,
      objective: a.objective ?? "",
      targetLeads: a.targetLeads === null ? "" : String(a.targetLeads),
      budget: a.budget === null ? "" : String(toNumber(a.budget)),
      spend: a.spend === null ? "" : String(toNumber(a.spend)),
      startDate: a.startDate ? formatDate(a.startDate, "yyyy-MM-dd") : "",
      endDate: a.endDate ? formatDate(a.endDate, "yyyy-MM-dd") : "",
      notes: a.notes ?? "",
    };
    return {
      id: a.id,
      name: a.name,
      channel: a.channel,
      status: a.status,
      objective: a.objective,
      targetLeads: a.targetLeads,
      budget: toNumber(a.budget),
      spend: toNumber(a.spend),
      startDateLabel: a.startDate
        ? formatDate(a.startDate, "MMM d, yyyy")
        : null,
      endDateLabel: a.endDate ? formatDate(a.endDate, "MMM d, yyyy") : null,
      leadCount,
      costPerLead: leadCount > 0 ? costPerLead(a.spend, leadCount) : null,
      defaults,
    };
  });

  const emptyDefaults: MarketingDefaults = {
    id: "",
    name: "",
    channel: "OTHER",
    status: "PLANNED",
    objective: "",
    targetLeads: "",
    budget: "",
    spend: "",
    startDate: "",
    endDate: "",
    notes: "",
  };

  return (
    <div>
      <PageHeader
        title="Marketing"
        description="Campaigns, channels and marketing activities that feed the pipeline."
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Activities"
          value={activities.length}
          hint={`${activeCount} active`}
          icon={<Icon name="Megaphone" className="h-4 w-4" />}
        />
        <StatCard
          label="Total budget"
          value={formatCurrency(totalBudget, user.currency)}
        />
        <StatCard
          label="Spend to date"
          value={formatCurrency(totalSpend, user.currency)}
          tone={totalSpend > totalBudget ? "danger" : "default"}
        />
        <StatCard
          label="Attributed leads"
          value={attributedLeads.length}
          hint={`${formatPercent(attributionRate(attributedLeads.length, leads.length))} of all leads`}
        />
      </section>

      <section className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Cost per lead"
          value={
            attributedLeads.length > 0
              ? formatCurrency(overallCostPerLead, user.currency)
              : "—"
          }
        />
        <StatCard
          label="Channels in use"
          value={breakdown.length}
        />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader
              title="Activities"
              subtitle={`${activities.length} total`}
            />
            <CardBody>
              <MarketingActivityList activities={rows} currency={user.currency} />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="New activity" />
            <CardBody>
              <MarketingActivityForm mode="create" defaults={emptyDefaults} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Channel effectiveness" />
            <CardBody className="p-0">
              {breakdown.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-400 sm:px-5">
                  No activity data yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                        <th className="px-4 py-2 font-medium sm:px-5">
                          Channel
                        </th>
                        <th className="px-2 py-2 text-right font-medium">
                          Leads
                        </th>
                        <th className="px-2 py-2 text-right font-medium">
                          Won
                        </th>
                        <th className="px-4 py-2 text-right font-medium sm:px-5">
                          CPL
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {breakdown.map((b) => (
                        <tr
                          key={b.channel}
                          className="border-b border-slate-50 last:border-0"
                        >
                          <td className="px-4 py-2 text-slate-700 sm:px-5">
                            {MARKETING_CHANNEL_LABELS[
                              b.channel as MarketingChannelValue
                            ]}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums text-slate-600">
                            {b.leads}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums text-slate-600">
                            {b.won}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-slate-600 sm:px-5">
                            {b.leads > 0
                              ? formatCurrency(b.costPerLead, user.currency)
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
        </div>
      </section>
    </div>
  );
}
