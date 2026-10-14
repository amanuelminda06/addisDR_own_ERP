import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/currency";
import { formatDate, formatDateTime } from "@/lib/datetime";
import {
  LEAD_PRIORITY_LABELS,
  LEAD_STATUS_LABELS,
} from "@/lib/labels";
import {
  effectiveFollowUpStatus,
  isLeadConvertible,
  LEAD_STATUS_TRANSITIONS,
  milestoneProgress,
  type LeadStatusValue,
} from "@/lib/commercial";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Icon } from "@/components/icons";
import { LeadForm, type LeadFormDefaults } from "@/components/commercial/LeadForm";
import {
  LeadActions,
} from "@/components/commercial/LeadActions";
import {
  MilestonePanel,
  type MilestoneView,
} from "@/components/commercial/MilestonePanel";
import {
  FollowUpPanel,
  type FollowUpView,
} from "@/components/commercial/FollowUpPanel";
import {
  InteractionPanel,
  type InteractionView,
} from "@/components/commercial/InteractionPanel";
import { ConvertLeadForm } from "@/components/commercial/ConvertLeadForm";

export const metadata = { title: "Lead · Commercial" };
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

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const now = new Date();

  const [lead, activities] = await Promise.all([
    prisma.lead.findUnique({
      where: { id },
      include: {
        marketingActivity: { select: { name: true } },
        milestones: { orderBy: { reachedAt: "asc" } },
        followUps: {
          orderBy: { dueAt: "desc" },
          include: { reschedules: { orderBy: { rescheduledAt: "asc" } } },
        },
        interactions: { orderBy: { occurredAt: "desc" } },
        client: { select: { id: true, name: true } },
        projects: { select: { id: true, name: true, status: true } },
      },
    }),
    prisma.marketingActivity.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!lead) notFound();

  const status = lead.status as LeadStatusValue;
  const allowedStatuses = LEAD_STATUS_TRANSITIONS[status];

  const defaults: LeadFormDefaults = {
    id: lead.id,
    name: lead.name,
    contactName: lead.contactName ?? "",
    company: lead.company ?? "",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    category: lead.category ?? "",
    area: lead.area ?? "",
    address: lead.address ?? "",
    source: lead.source ?? "",
    status: lead.status,
    priority: lead.priority,
    estimatedValue:
      lead.estimatedValue === null ? "" : String(toNumber(lead.estimatedValue)),
    probability: lead.probability === null ? "" : String(lead.probability),
    expectedCloseAt: lead.expectedCloseAt
      ? formatDate(lead.expectedCloseAt, "yyyy-MM-dd")
      : "",
    nextAction: lead.nextAction ?? "",
    nextActionAt: lead.nextActionAt
      ? formatDateTime(lead.nextActionAt, "yyyy-MM-dd'T'HH:mm")
      : "",
    notes: lead.notes ?? "",
    lostReason: lead.lostReason ?? "",
    marketingActivityId: lead.marketingActivityId ?? "",
  };

  const milestones: MilestoneView[] = lead.milestones.map((m) => ({
    id: m.id,
    stage: m.stage,
    notes: m.notes,
    reachedAtLabel: formatDateTime(m.reachedAt),
  }));

  const reachedStages = lead.milestones.map((m) => m.stage);
  const progress = milestoneProgress(reachedStages);

  const followUps: FollowUpView[] = [...lead.followUps]
    .sort((a, b) => {
      const aOpen = a.status === "SCHEDULED" ? 0 : 1;
      const bOpen = b.status === "SCHEDULED" ? 0 : 1;
      if (aOpen !== bOpen) return aOpen - bOpen;
      return aOpen === 0
        ? a.dueAt.getTime() - b.dueAt.getTime()
        : b.dueAt.getTime() - a.dueAt.getTime();
    })
    .map((f) => ({
      id: f.id,
      dueAtLabel: formatDateTime(f.dueAt),
      channel: f.channel,
      purpose: f.purpose,
      notes: f.notes,
      status: f.status,
      effectiveStatus: effectiveFollowUpStatus(
        { status: f.status, dueAt: f.dueAt },
        now,
      ),
      outcome: f.outcome,
      completedAtLabel: f.completedAt ? formatDateTime(f.completedAt) : null,
      reschedules: f.reschedules.map((r) => ({
        fromLabel: formatDateTime(r.fromDueAt),
        toLabel: formatDateTime(r.toDueAt),
        reason: r.reason,
        rescheduledAtLabel: formatDateTime(r.rescheduledAt),
      })),
    }));

  const interactions: InteractionView[] = lead.interactions.map((i) => ({
    id: i.id,
    type: i.type,
    summary: i.summary,
    notes: i.notes,
    occurredAtLabel: formatDateTime(i.occurredAt),
  }));

  const convertible = isLeadConvertible({
    status,
    hasClient: Boolean(lead.client),
  });

  return (
    <div>
      <PageHeader
        title={lead.name}
        description={
          lead.company ??
          lead.contactName ??
          "Lead detail, milestones and follow-ups"
        }
        action={
          <Link
            href="/commercial"
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            <Icon name="ArrowRight" className="h-4 w-4 rotate-180" />
            Back to pipeline
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={STATUS_TONE[status]}>{LEAD_STATUS_LABELS[status]}</Badge>
        <Badge tone="neutral">
          {LEAD_PRIORITY_LABELS[lead.priority]} priority
        </Badge>
        {lead.client ? (
          <Badge tone="success">
            <Icon name="Handshake" className="h-3 w-3" />
            Client: {lead.client.name}
          </Badge>
        ) : null}
        <div className="ml-auto">
          <LeadActions
            leadId={lead.id}
            status={status}
            name={lead.name}
            allowedStatuses={allowedStatuses}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Lead details" />
            <CardBody>
              <LeadForm
                mode="edit"
                defaults={defaults}
                activities={activities}
                allowedStatuses={allowedStatuses}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Follow-ups"
              subtitle={`${followUps.filter((f) => f.status === "SCHEDULED").length} scheduled`}
            />
            <CardBody>
              <FollowUpPanel leadId={lead.id} followUps={followUps} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Communication log"
              subtitle={`${interactions.length} entries`}
            />
            <CardBody>
              <InteractionPanel leadId={lead.id} interactions={interactions} />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Summary"
              action={
                <span className="text-xs text-slate-400">
                  {Math.round(progress * 100)}% journey
                </span>
              }
            />
            <CardBody className="space-y-2 text-sm">
              <SummaryRow
                label="Estimated value"
                value={formatCurrency(lead.estimatedValue, user.currency)}
              />
              <SummaryRow
                label="Probability"
                value={`${lead.probability ?? 0}%`}
              />
              <SummaryRow
                label="Weighted value"
                value={formatCurrency(
                  (toNumber(lead.estimatedValue) * (lead.probability ?? 0)) / 100,
                  user.currency,
                )}
              />
              <SummaryRow
                label="Expected close"
                value={
                  lead.expectedCloseAt
                    ? formatDate(lead.expectedCloseAt, "MMM d, yyyy")
                    : "—"
                }
              />
              <SummaryRow label="Source" value={lead.source ?? "—"} />
              <SummaryRow
                label="Channel"
                value={lead.marketingActivity?.name ?? "—"}
              />
              <SummaryRow
                label="Last contacted"
                value={
                  lead.lastContactedAt
                    ? formatDateTime(lead.lastContactedAt, "MMM d, yyyy HH:mm")
                    : "—"
                }
              />
              {lead.nextAction ? (
                <SummaryRow label="Next action" value={lead.nextAction} />
              ) : null}
              {lead.lostReason ? (
                <SummaryRow label="Lost reason" value={lead.lostReason} />
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Communication milestones" />
            <CardBody>
              <MilestonePanel leadId={lead.id} milestones={milestones} />
            </CardBody>
          </Card>

          {lead.client ? (
            <Card>
              <CardHeader title="Client & projects" />
              <CardBody className="space-y-2 text-sm">
                <SummaryRow label="Client" value={lead.client.name} />
                {lead.projects.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    No projects linked yet.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {lead.projects.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between text-slate-600"
                      >
                        <span className="truncate">{p.name}</span>
                        <Badge tone="neutral">{p.status}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href="/projects"
                  className="inline-block text-sm font-medium text-brand-700 hover:underline"
                >
                  View projects →
                </Link>
              </CardBody>
            </Card>
          ) : convertible ? (
            <Card>
              <CardHeader
                title="Convert to client"
                subtitle="Turn this won lead into a client and optional project"
              />
              <CardBody>
                <ConvertLeadForm
                  leadId={lead.id}
                  defaultClientName={lead.company ?? lead.name}
                />
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-700">{value}</span>
    </div>
  );
}
