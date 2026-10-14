"use client";

import { useActionState } from "react";
import {
  createMarketingActivityAction,
  updateMarketingActivityAction,
  type MarketingFormState,
} from "@/lib/actions/marketing";
import {
  MARKETING_CHANNEL_LABELS,
  MARKETING_STATUS_LABELS,
} from "@/lib/labels";
import { MARKETING_CHANNELS, MARKETING_STATUSES } from "@/lib/validation";
import { Button } from "@/components/ui/Button";

const initialState: MarketingFormState = null;

export type MarketingDefaults = {
  id: string;
  name: string;
  channel: string;
  status: string;
  objective: string;
  targetLeads: string;
  budget: string;
  spend: string;
  startDate: string;
  endDate: string;
  notes: string;
};

export function MarketingActivityForm({
  mode,
  defaults,
  onDone,
}: {
  mode: "create" | "edit";
  defaults: MarketingDefaults;
  onDone?: () => void;
}) {
  const action =
    mode === "create"
      ? createMarketingActivityAction
      : updateMarketingActivityAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {defaults.id ? <input type="hidden" name="id" value={defaults.id} /> : null}

      {state?.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.success}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="field-label">
            Activity name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={160}
            defaultValue={defaults.name}
            className="field-input"
            placeholder="e.g. January LinkedIn campaign"
          />
        </div>
        <div>
          <label htmlFor="objective" className="field-label">
            Objective
          </label>
          <input
            id="objective"
            name="objective"
            maxLength={300}
            defaultValue={defaults.objective}
            className="field-input"
            placeholder="e.g. Generate 40 qualified leads"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="channel" className="field-label">
            Channel
          </label>
          <select
            id="channel"
            name="channel"
            defaultValue={defaults.channel}
            className="field-input"
          >
            {MARKETING_CHANNELS.map((c) => (
              <option key={c} value={c}>
                {MARKETING_CHANNEL_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="status" className="field-label">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={defaults.status}
            className="field-input"
          >
            {MARKETING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {MARKETING_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="targetLeads" className="field-label">
            Target leads
          </label>
          <input
            id="targetLeads"
            name="targetLeads"
            type="number"
            min={0}
            defaultValue={defaults.targetLeads}
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="budget" className="field-label">
            Budget (ETB)
          </label>
          <input
            id="budget"
            name="budget"
            type="number"
            min={0}
            step="0.01"
            defaultValue={defaults.budget}
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="spend" className="field-label">
            Spend to date (ETB)
          </label>
          <input
            id="spend"
            name="spend"
            type="number"
            min={0}
            step="0.01"
            defaultValue={defaults.spend}
            className="field-input"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="startDate" className="field-label">
            Start date
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={defaults.startDate}
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="endDate" className="field-label">
            End date
          </label>
          <input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={defaults.endDate}
            className="field-input"
          />
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="field-label">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          maxLength={2000}
          defaultValue={defaults.notes}
          className="field-input"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Saving…"
            : mode === "create"
              ? "Create activity"
              : "Save changes"}
        </Button>
        {onDone ? (
          <button
            type="button"
            onClick={onDone}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

export type { MarketingFormState };
