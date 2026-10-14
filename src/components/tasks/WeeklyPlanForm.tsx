"use client";

import { useActionState } from "react";
import {
  upsertWeekPlanAction,
  type DailyWorkFormState,
} from "@/lib/actions/daily-work";
import { WEEK_PLAN_STATUSES } from "@/lib/validation";
import { WEEK_PLAN_STATUS_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/Button";

const initialState: DailyWorkFormState = null;

export type WeekPlanDefaults = {
  id: string;
  weekStart: string;
  objectives: string;
  commercialTargets: string;
  financialObjectives: string;
  workLocations: string;
  notes: string;
  status: string;
};

export function WeeklyPlanForm({ defaults }: { defaults: WeekPlanDefaults }) {
  const [state, formAction, pending] = useActionState(
    upsertWeekPlanAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={defaults.id} />
      <input type="hidden" name="weekStart" value={defaults.weekStart} />

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

      <div>
        <label className="field-label">Objectives for the week</label>
        <textarea
          name="objectives"
          rows={2}
          defaultValue={defaults.objectives}
          className="field-input"
          placeholder="What must be achieved this week"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label">Commercial targets</label>
          <textarea
            name="commercialTargets"
            rows={2}
            defaultValue={defaults.commercialTargets}
            className="field-input"
            placeholder="Leads, proposals, deals to win"
          />
        </div>
        <div>
          <label className="field-label">Financial objectives</label>
          <textarea
            name="financialObjectives"
            rows={2}
            defaultValue={defaults.financialObjectives}
            className="field-input"
            placeholder="Income, savings, allowance goals"
          />
        </div>
      </div>

      <div>
        <label className="field-label">Work locations</label>
        <input
          name="workLocations"
          defaultValue={defaults.workLocations}
          maxLength={2000}
          className="field-input"
          placeholder="Office / home / client sites planned"
        />
      </div>

      <div>
        <label className="field-label">
          Lessons learned &amp; notes
        </label>
        <textarea
          name="notes"
          rows={2}
          defaultValue={defaults.notes}
          className="field-input"
          placeholder="Carry-over tasks, planned leave, adjustments"
        />
      </div>

      <div>
        <label className="field-label">Status</label>
        <select name="status" defaultValue={defaults.status} className="field-input">
          {WEEK_PLAN_STATUSES.map((s) => (
            <option key={s} value={s}>
              {WEEK_PLAN_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save weekly plan"}
      </Button>
    </form>
  );
}
