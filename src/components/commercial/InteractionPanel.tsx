"use client";

import { useActionState } from "react";
import {
  recordInteractionAction,
  type CommercialFormState,
} from "@/lib/actions/commercial";
import { CONTACT_TYPE_LABELS } from "@/lib/labels";
import { CONTACT_TYPES } from "@/lib/validation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/icons";

const initialState: CommercialFormState = null;

export type InteractionView = {
  id: string;
  type: keyof typeof CONTACT_TYPE_LABELS;
  summary: string;
  notes: string | null;
  occurredAtLabel: string;
};

export function InteractionPanel({
  leadId,
  interactions,
}: {
  leadId: string;
  interactions: InteractionView[];
}) {
  const [state, formAction, pending] = useActionState(
    recordInteractionAction,
    initialState,
  );

  return (
    <div className="space-y-4">
      {interactions.length === 0 ? (
        <EmptyState
          icon={<Icon name="MessageSquare" className="h-6 w-6" />}
          title="No interactions yet"
          description="Log calls, emails and meetings to build the communication history."
          className="py-6"
        />
      ) : (
        <ul className="space-y-3">
          {interactions.map((i) => (
            <li key={i.id} className="flex gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-400" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">{CONTACT_TYPE_LABELS[i.type]}</Badge>
                  <span className="text-xs text-slate-400">
                    {i.occurredAtLabel}
                  </span>
                </div>
                <p className="text-sm text-slate-700">{i.summary}</p>
                {i.notes ? (
                  <p className="text-xs text-slate-500">{i.notes}</p>
                ) : null}
              </div>
            </li>
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
            <label htmlFor="type" className="field-label">
              Type
            </label>
            <select id="type" name="type" className="field-input" defaultValue="CALL">
              {CONTACT_TYPES.map((c) => (
                <option key={c} value={c}>
                  {CONTACT_TYPE_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="occurredAt" className="field-label">
              When (optional)
            </label>
            <input
              id="occurredAt"
              name="occurredAt"
              type="datetime-local"
              className="field-input"
            />
          </div>
        </div>
        <div>
          <label htmlFor="summary" className="field-label">
            Summary <span className="text-red-500">*</span>
          </label>
          <input
            id="summary"
            name="summary"
            required
            maxLength={300}
            className="field-input"
            placeholder="e.g. Discussed pricing and timeline"
          />
        </div>
        <div>
          <label htmlFor="interactionNotes" className="field-label">
            Notes (optional)
          </label>
          <textarea
            id="interactionNotes"
            name="notes"
            rows={2}
            maxLength={2000}
            className="field-input"
          />
        </div>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "Logging…" : "Log interaction"}
        </Button>
      </form>
    </div>
  );
}
