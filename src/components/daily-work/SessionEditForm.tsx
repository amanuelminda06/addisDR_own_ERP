"use client";

import { useActionState } from "react";
import {
  updateSessionAction,
  type DailyWorkFormState,
} from "@/lib/actions/daily-work";
import { WORK_SESSION_STATUSES } from "@/lib/validation";
import { WORK_SESSION_STATUS_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/Button";

const initialState: DailyWorkFormState = null;

export type SessionEditDefaults = {
  id: string;
  focus: string;
  location: string;
  plannedStart: string;
  plannedEnd: string;
  plannedMinutes: string;
  actualMinutes: string;
  status: string;
  notes: string;
};

export function SessionEditForm({ defaults }: { defaults: SessionEditDefaults }) {
  const [state, formAction, pending] = useActionState(
    updateSessionAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={defaults.id} />

      {state?.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {state.success}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="field-label">Focus</label>
          <input
            name="focus"
            defaultValue={defaults.focus}
            maxLength={300}
            className="field-input"
            placeholder="What this session is for"
          />
        </div>
        <div>
          <label className="field-label">Work location</label>
          <input
            name="location"
            defaultValue={defaults.location}
            maxLength={200}
            className="field-input"
            placeholder="Office, home, client site…"
          />
        </div>
        <div>
          <label className="field-label">Planned start</label>
          <input
            name="plannedStart"
            type="time"
            defaultValue={defaults.plannedStart}
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">Planned end</label>
          <input
            name="plannedEnd"
            type="time"
            defaultValue={defaults.plannedEnd}
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">Planned minutes</label>
          <input
            name="plannedMinutes"
            type="number"
            min={0}
            max={1440}
            defaultValue={defaults.plannedMinutes}
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">Actual minutes</label>
          <input
            name="actualMinutes"
            type="number"
            min={0}
            max={1440}
            defaultValue={defaults.actualMinutes}
            className="field-input"
            placeholder="Leave blank if not done"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label">Status</label>
          <select name="status" defaultValue={defaults.status} className="field-input">
            {WORK_SESSION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {WORK_SESSION_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="field-label">Notes</label>
        <textarea
          name="notes"
          rows={2}
          defaultValue={defaults.notes}
          maxLength={2000}
          className="field-input"
        />
      </div>

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save session"}
      </Button>
    </form>
  );
}
