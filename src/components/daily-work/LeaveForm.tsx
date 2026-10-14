"use client";

import { useActionState } from "react";
import {
  markPlannedLeaveAction,
  type DailyWorkFormState,
} from "@/lib/actions/daily-work";
import { Button } from "@/components/ui/Button";

const initialState: DailyWorkFormState = null;

export function LeaveForm({ date }: { date: string }) {
  const [state, formAction, pending] = useActionState(
    markPlannedLeaveAction,
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
        Planned leave clears this day&apos;s unstarted slots. Completed sessions
        are always kept.
      </p>
      <input
        name="reason"
        className="field-input"
        maxLength={300}
        placeholder="Reason (optional)"
      />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Recording…" : "Mark planned leave"}
      </Button>
    </form>
  );
}
