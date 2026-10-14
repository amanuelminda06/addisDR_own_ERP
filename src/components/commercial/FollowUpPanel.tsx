"use client";

import { useActionState, useState, useTransition } from "react";
import {
  cancelFollowUpAction,
  completeFollowUpAction,
  createFollowUpAction,
  rescheduleFollowUpAction,
  type CommercialFormState,
} from "@/lib/actions/commercial";
import { CONTACT_TYPE_LABELS, FOLLOW_UP_STATUS_LABELS } from "@/lib/labels";
import { CONTACT_TYPES } from "@/lib/validation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/icons";

const initialState: CommercialFormState = null;

export type FollowUpRescheduleView = {
  fromLabel: string;
  toLabel: string;
  reason: string | null;
  rescheduledAtLabel: string;
};

export type FollowUpView = {
  id: string;
  dueAtLabel: string;
  channel: keyof typeof CONTACT_TYPE_LABELS;
  purpose: string | null;
  notes: string | null;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  effectiveStatus: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "OVERDUE";
  outcome: string | null;
  completedAtLabel: string | null;
  reschedules: FollowUpRescheduleView[];
};

const STATUS_TONE = {
  SCHEDULED: "info",
  OVERDUE: "danger",
  COMPLETED: "success",
  CANCELLED: "muted",
} as const;

export function FollowUpPanel({
  leadId,
  followUps,
}: {
  leadId: string;
  followUps: FollowUpView[];
}) {
  const [state, formAction, pending] = useActionState(
    createFollowUpAction,
    initialState,
  );

  return (
    <div className="space-y-4">
      {followUps.length === 0 ? (
        <EmptyState
          icon={<Icon name="CalendarPlus" className="h-6 w-6" />}
          title="No follow-ups scheduled"
          description="Schedule a follow-up to keep this lead moving and receive a reminder."
          className="py-6"
        />
      ) : (
        <ul className="space-y-3">
          {followUps.map((f) => (
            <FollowUpRow key={f.id} followUp={f} />
          ))}
        </ul>
      )}

      <form action={formAction} className="space-y-3 border-t border-slate-100 pt-4">
        <input type="hidden" name="leadId" value={leadId} />
        {state?.error ? (
          <p className="text-sm text-red-600">{state.error}</p>
        ) : null}
        {state?.success ? (
          <p className="text-sm text-emerald-600">{state.success}</p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="dueAt" className="field-label">
              Follow-up due (Addis time)
            </label>
            <input
              id="dueAt"
              name="dueAt"
              type="datetime-local"
              required
              className="field-input"
            />
          </div>
          <div>
            <label htmlFor="channel" className="field-label">
              Channel
            </label>
            <select
              id="channel"
              name="channel"
              className="field-input"
              defaultValue="CALL"
            >
              {CONTACT_TYPES.map((c) => (
                <option key={c} value={c}>
                  {CONTACT_TYPE_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="purpose" className="field-label">
            Purpose
          </label>
          <input
            id="purpose"
            name="purpose"
            maxLength={200}
            className="field-input"
            placeholder="e.g. Confirm meeting time"
          />
        </div>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "Scheduling…" : "Schedule follow-up"}
        </Button>
      </form>
    </div>
  );
}

function FollowUpRow({ followUp }: { followUp: FollowUpView }) {
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"none" | "complete" | "reschedule">("none");
  const [completeState, completeAction, completePending] = useActionState(
    completeFollowUpAction,
    initialState,
  );
  const [rescheduleState, rescheduleAction, reschedulePending] = useActionState(
    rescheduleFollowUpAction,
    initialState,
  );

  const open = followUp.effectiveStatus === "SCHEDULED" || followUp.effectiveStatus === "OVERDUE";

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-700">
              {followUp.dueAtLabel}
            </span>
            <Badge tone="neutral">{CONTACT_TYPE_LABELS[followUp.channel]}</Badge>
            <Badge tone={STATUS_TONE[followUp.effectiveStatus]}>
              {FOLLOW_UP_STATUS_LABELS[followUp.status]}
              {followUp.effectiveStatus === "OVERDUE" ? " · Overdue" : ""}
            </Badge>
          </div>
          {followUp.purpose ? (
            <p className="mt-1 text-sm text-slate-600">{followUp.purpose}</p>
          ) : null}
          {followUp.outcome ? (
            <p className="mt-1 text-xs text-slate-500">Outcome: {followUp.outcome}</p>
          ) : null}
          {followUp.reschedules.length > 0 ? (
            <p className="mt-1 text-[11px] text-slate-400">
              Rescheduled {followUp.reschedules.length}× · last{" "}
              {followUp.reschedules[followUp.reschedules.length - 1].toLabel}
              {followUp.reschedules[followUp.reschedules.length - 1].reason
                ? ` (${followUp.reschedules[followUp.reschedules.length - 1].reason})`
                : ""}
            </p>
          ) : null}
        </div>

        {open ? (
          <div className="flex shrink-0 flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setMode(mode === "complete" ? "none" : "complete")}
              className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
            >
              Complete
            </button>
            <button
              type="button"
              onClick={() => setMode(mode === "reschedule" ? "none" : "reschedule")}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Reschedule
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => cancelFollowUpAction(followUp.id))}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        ) : null}
      </div>

      {mode === "complete" && open ? (
        <form action={completeAction} className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          <input type="hidden" name="followUpId" value={followUp.id} />
          {completeState?.error ? (
            <p className="text-xs text-red-600">{completeState.error}</p>
          ) : null}
          <input
            name="outcome"
            maxLength={1000}
            className="field-input"
            placeholder="Outcome / notes"
          />
          <Button type="submit" size="sm" disabled={completePending}>
            {completePending ? "Saving…" : "Mark completed"}
          </Button>
        </form>
      ) : null}

      {mode === "reschedule" && open ? (
        <form action={rescheduleAction} className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          <input type="hidden" name="followUpId" value={followUp.id} />
          {rescheduleState?.error ? (
            <p className="text-xs text-red-600">{rescheduleState.error}</p>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              name="dueAt"
              type="datetime-local"
              required
              className="field-input"
            />
            <input
              name="reason"
              maxLength={200}
              className="field-input"
              placeholder="Reason (optional)"
            />
          </div>
          <Button type="submit" size="sm" variant="outline" disabled={reschedulePending}>
            {reschedulePending ? "Saving…" : "Reschedule"}
          </Button>
        </form>
      ) : null}
    </li>
  );
}
