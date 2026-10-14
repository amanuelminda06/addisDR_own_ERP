"use client";

import { useActionState } from "react";
import {
  addExtraSessionAction,
  type DailyWorkFormState,
} from "@/lib/actions/daily-work";
import { Button } from "@/components/ui/Button";

const initialState: DailyWorkFormState = null;

export function ExtraSessionForm({ date }: { date: string }) {
  const [state, formAction, pending] = useActionState(
    addExtraSessionAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="date" value={date} />
      {state?.error ? (
        <p className="text-xs text-red-600">{state.error}</p>
      ) : null}
      {state?.success ? (
        <p className="text-xs text-emerald-600">{state.success}</p>
      ) : null}
      <p className="text-xs text-slate-500">
        Add an extra session for advance compensation (working ahead) or an
        emergency catch-up.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="focus"
          className="field-input"
          maxLength={300}
          placeholder="Focus (e.g. catch-up)"
        />
        <input
          name="location"
          className="field-input"
          maxLength={200}
          placeholder="Location"
        />
      </div>
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Adding…" : "Add extra session"}
      </Button>
    </form>
  );
}
