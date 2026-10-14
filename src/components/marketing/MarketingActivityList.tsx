"use client";

import { useState, useTransition } from "react";
import { deleteMarketingActivityAction } from "@/lib/actions/marketing";
import {
  MARKETING_CHANNEL_LABELS,
  MARKETING_STATUS_LABELS,
} from "@/lib/labels";
import { formatCurrency } from "@/lib/currency";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/icons";
import {
  MarketingActivityForm,
  type MarketingDefaults,
} from "@/components/marketing/MarketingActivityForm";

export type MarketingActivityRow = {
  id: string;
  name: string;
  channel: keyof typeof MARKETING_CHANNEL_LABELS;
  status: keyof typeof MARKETING_STATUS_LABELS;
  objective: string | null;
  targetLeads: number | null;
  budget: number;
  spend: number;
  startDateLabel: string | null;
  endDateLabel: string | null;
  leadCount: number;
  costPerLead: number | null;
  defaults: MarketingDefaults;
};

const STATUS_TONE = {
  PLANNED: "neutral",
  ACTIVE: "info",
  PAUSED: "warning",
  COMPLETED: "success",
  CANCELLED: "muted",
} as const;

export function MarketingActivityList({
  activities,
  currency,
}: {
  activities: MarketingActivityRow[];
  currency: string;
}) {
  if (activities.length === 0) {
    return (
      <EmptyState
        icon={<Icon name="Megaphone" className="h-6 w-6" />}
        title="No marketing activities"
        description="Create an activity to track channels, budget and lead generation."
        className="py-8"
      />
    );
  }

  return (
    <ul className="space-y-3">
      {activities.map((a) => (
        <MarketingActivityCard key={a.id} activity={a} currency={currency} />
      ))}
    </ul>
  );
}

function MarketingActivityCard({
  activity,
  currency,
}: {
  activity: MarketingActivityRow;
  currency: string;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const budgetPct =
    activity.budget > 0
      ? Math.min(100, Math.round((activity.spend / activity.budget) * 100))
      : null;
  const leadsPct =
    activity.targetLeads && activity.targetLeads > 0
      ? Math.min(100, Math.round((activity.leadCount / activity.targetLeads) * 100))
      : null;
  const dates =
    activity.startDateLabel || activity.endDateLabel
      ? `${activity.startDateLabel ?? "—"} → ${activity.endDateLabel ?? "—"}`
      : null;

  if (editing) {
    return (
      <li className="card">
        <div className="card-header">
          <span className="card-title">Edit activity</span>
        </div>
        <div className="card-body">
          <MarketingActivityForm
            mode="edit"
            defaults={activity.defaults}
            onDone={() => setEditing(false)}
          />
        </div>
      </li>
    );
  }

  return (
    <li className="card">
      <div className="card-body space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-800">{activity.name}</span>
              <Badge tone="neutral">
                {MARKETING_CHANNEL_LABELS[activity.channel]}
              </Badge>
              <Badge tone={STATUS_TONE[activity.status]}>
                {MARKETING_STATUS_LABELS[activity.status]}
              </Badge>
            </div>
            {activity.objective ? (
              <p className="mt-1 text-sm text-slate-500">{activity.objective}</p>
            ) : null}
            {dates ? (
              <p className="mt-1 text-xs text-slate-400">{dates}</p>
            ) : null}
          </div>

          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Edit
            </button>
            {confirming ? (
              <>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(() => deleteMarketingActivityAction(activity.id))
                  }
                  className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {pending ? "…" : "Confirm"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  No
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-600"
              >
                Delete
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-slate-400">Leads</p>
            <p className="font-medium text-slate-700">
              {activity.leadCount}
              {activity.targetLeads ? (
                <span className="text-slate-400"> / {activity.targetLeads}</span>
              ) : null}
            </p>
            {leadsPct !== null ? (
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: `${leadsPct}%` }}
                />
              </div>
            ) : null}
          </div>
          <div>
            <p className="text-xs text-slate-400">Spend / budget</p>
            <p className="font-medium text-slate-700">
              {formatCurrency(activity.spend, currency)}
              {activity.budget > 0 ? (
                <span className="text-slate-400">
                  {" "}
                  / {formatCurrency(activity.budget, currency)}
                </span>
              ) : null}
            </p>
            {budgetPct !== null ? (
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={
                    budgetPct >= 100
                      ? "h-full rounded-full bg-red-500"
                      : "h-full rounded-full bg-emerald-500"
                  }
                  style={{ width: `${budgetPct}%` }}
                />
              </div>
            ) : null}
          </div>
          <div>
            <p className="text-xs text-slate-400">Cost per lead</p>
            <p className="font-medium text-slate-700">
              {activity.costPerLead === null
                ? "—"
                : formatCurrency(activity.costPerLead, currency)}
            </p>
          </div>
        </div>
      </div>
    </li>
  );
}
