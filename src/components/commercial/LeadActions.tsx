"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteLeadAction,
  moveLeadStatusAction,
} from "@/lib/actions/commercial";
import { LEAD_STATUS_LABELS } from "@/lib/labels";
import type { LeadStatusValue } from "@/lib/commercial";

export function LeadActions({
  leadId,
  status,
  name,
  allowedStatuses,
}: {
  leadId: string;
  status: LeadStatusValue;
  name: string;
  allowedStatuses: LeadStatusValue[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {allowedStatuses.length > 0 ? (
        <select
          aria-label="Change stage"
          disabled={pending}
          defaultValue=""
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-60"
          onChange={(e) => {
            const next = e.target.value as LeadStatusValue;
            if (!next) return;
            startTransition(() => moveLeadStatusAction(leadId, next));
            e.currentTarget.value = "";
          }}
        >
          <option value="">Change stage…</option>
          {allowedStatuses.map((s) => (
            <option key={s} value={s}>
              {LEAD_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      ) : (
        <span className="text-xs text-slate-400">
          Current stage: {LEAD_STATUS_LABELS[status]}
        </span>
      )}

      {confirming ? (
        <span className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Delete {name}?</span>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await deleteLeadAction(leadId);
                router.push("/commercial");
              })
            }
            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {pending ? "Deleting…" : "Yes, delete"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600"
        >
          Delete lead
        </button>
      )}
    </div>
  );
}
