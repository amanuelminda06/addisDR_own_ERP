"use client";

import { useActionState, useTransition } from "react";
import {
  achieveMilestoneAction,
  deleteMilestoneAction,
  type CommercialFormState,
} from "@/lib/actions/commercial";
import { MILESTONE_STAGE_LABELS } from "@/lib/labels";
import { MILESTONE_STAGES } from "@/lib/validation";
import { MILESTONE_STAGES as ORDERED_STAGES } from "@/lib/commercial";
import { Button } from "@/components/ui/Button";

const initialState: CommercialFormState = null;

export type MilestoneView = {
  id: string;
  stage: string;
  notes: string | null;
  reachedAtLabel: string;
};

export function MilestonePanel({
  leadId,
  milestones,
}: {
  leadId: string;
  milestones: MilestoneView[];
}) {
  const [state, formAction, pending] = useActionState(
    achieveMilestoneAction,
    initialState,
  );
  const reachedByStage = new Map(milestones.map((m) => [m.stage, m]));

  return (
    <div className="space-y-4">
      <ol className="space-y-2">
        {ORDERED_STAGES.map((stage, index) => {
          const reached = reachedByStage.get(stage);
          return (
            <li key={stage} className="flex items-start gap-3">
              <span
                className={
                  reached
                    ? "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-500 text-[10px] font-bold text-white"
                    : "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-slate-300 bg-white text-[10px] text-slate-400"
                }
              >
                {reached ? "✓" : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={
                      reached
                        ? "text-sm font-medium text-slate-800"
                        : "text-sm text-slate-400"
                    }
                  >
                    {MILESTONE_STAGE_LABELS[stage]}
                  </span>
                  {reached ? (
                    <span className="text-xs text-slate-400">
                      {reached.reachedAtLabel}
                    </span>
                  ) : null}
                </div>
                {reached?.notes ? (
                  <p className="text-xs text-slate-500">{reached.notes}</p>
                ) : null}
              </div>
              {reached ? (
                <DeleteMilestoneButton milestoneId={reached.id} />
              ) : null}
            </li>
          );
        })}
      </ol>

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
            <label htmlFor="stage" className="field-label">
              Record milestone
            </label>
            <select
              id="stage"
              name="stage"
              className="field-input"
              defaultValue="FIRST_CONTACT"
            >
              {MILESTONE_STAGES.map((s) => (
                <option key={s} value={s}>
                  {MILESTONE_STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="reachedAt" className="field-label">
              Reached at (optional)
            </label>
            <input
              id="reachedAt"
              name="reachedAt"
              type="datetime-local"
              className="field-input"
            />
          </div>
        </div>
        <div>
          <label htmlFor="milestoneNotes" className="field-label">
            Notes (optional)
          </label>
          <input
            id="milestoneNotes"
            name="notes"
            maxLength={1000}
            className="field-input"
          />
        </div>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "Saving…" : "Record milestone"}
        </Button>
      </form>
    </div>
  );
}

function DeleteMilestoneButton({ milestoneId }: { milestoneId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label="Remove milestone"
      onClick={() => startTransition(() => deleteMilestoneAction(milestoneId))}
      className="shrink-0 rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:opacity-60"
    >
      Remove
    </button>
  );
}
