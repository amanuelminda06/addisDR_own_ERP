"use client";

import { useTransition } from "react";
import Link from "next/link";
import { moveLeadStatusAction } from "@/lib/actions/commercial";
import { LEAD_STATUS_TRANSITIONS, type LeadStatusValue } from "@/lib/commercial";
import { LEAD_STATUS_LABELS, LEAD_PRIORITY_LABELS } from "@/lib/labels";
import { formatCurrency } from "@/lib/currency";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/icons";

export type BoardLead = {
  id: string;
  name: string;
  company: string | null;
  status: LeadStatusValue;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  estimatedValue: number;
  probability: number;
  nextFollowUpLabel: string | null;
  stale: boolean;
};

const OPEN_COLUMNS: LeadStatusValue[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
];

const PRIORITY_TONE = {
  LOW: "muted",
  MEDIUM: "neutral",
  HIGH: "warning",
  URGENT: "danger",
} as const;

const STATUS_TONE: Record<LeadStatusValue, "neutral" | "info" | "warning" | "success" | "danger" | "brand"> = {
  NEW: "neutral",
  CONTACTED: "info",
  QUALIFIED: "brand",
  PROPOSAL: "warning",
  NEGOTIATION: "warning",
  WON: "success",
  LOST: "danger",
};

export function PipelineBoard({
  leads,
  currency,
}: {
  leads: BoardLead[];
  currency: string;
}) {
  if (leads.length === 0) {
    return (
      <EmptyState
        icon={<Icon name="Briefcase" className="h-6 w-6" />}
        title="No leads in the pipeline"
        description="Add your first lead to start tracking the commercial pipeline."
        className="py-10"
      />
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-5">
      {OPEN_COLUMNS.map((stage) => {
        const column = leads.filter((l) => l.status === stage);
        const total = column.reduce((sum, l) => sum + l.estimatedValue, 0);
        return (
          <div key={stage} className="flex flex-col rounded-xl bg-slate-100/70 p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {LEAD_STATUS_LABELS[stage]}
              </span>
              <Badge tone="neutral">{column.length}</Badge>
            </div>
            <p className="mb-2 px-1 text-[11px] text-slate-400">
              {formatCurrency(total, currency)}
            </p>
            <ul className="space-y-2">
              {column.map((lead) => (
                <PipelineCard key={lead.id} lead={lead} currency={currency} />
              ))}
              {column.length === 0 ? (
                <li className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-[11px] text-slate-400">
                  Empty
                </li>
              ) : null}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function PipelineCard({ lead, currency }: { lead: BoardLead; currency: string }) {
  const [pending, startTransition] = useTransition();
  const targets = LEAD_STATUS_TRANSITIONS[lead.status];

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/commercial/leads/${lead.id}`}
          className="min-w-0 font-medium text-slate-800 hover:text-brand-700 hover:underline"
        >
          {lead.name}
        </Link>
        <Badge tone={PRIORITY_TONE[lead.priority]}>
          {LEAD_PRIORITY_LABELS[lead.priority]}
        </Badge>
      </div>
      {lead.company ? (
        <p className="mt-0.5 truncate text-xs text-slate-400">{lead.company}</p>
      ) : null}
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="tabular-nums font-medium text-slate-700">
          {formatCurrency(lead.estimatedValue, currency)}
        </span>
        <span className="text-slate-400">{lead.probability}%</span>
      </div>
      <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
        {lead.stale ? (
          <span className="text-amber-600">Stale</span>
        ) : lead.nextFollowUpLabel ? (
          <span>Follow-up {lead.nextFollowUpLabel}</span>
        ) : (
          <span>No follow-up set</span>
        )}
      </div>

      {targets.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <select
            aria-label={`Move ${lead.name}`}
            disabled={pending}
            defaultValue=""
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-600 disabled:opacity-60"
            onChange={(e) => {
              const next = e.target.value as LeadStatusValue;
              if (!next) return;
              startTransition(() => moveLeadStatusAction(lead.id, next));
              e.currentTarget.value = "";
            }}
          >
            <option value="">Move to…</option>
            {targets.map((t) => (
              <option key={t} value={t}>
                {LEAD_STATUS_LABELS[t]}
              </option>
            ))}
          </select>
          <Badge tone={STATUS_TONE[lead.status]}>
            {LEAD_STATUS_LABELS[lead.status]}
          </Badge>
        </div>
      ) : null}
    </li>
  );
}
