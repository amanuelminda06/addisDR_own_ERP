"use client";

import { useActionState } from "react";
import {
  createAllowanceAdjustmentAction,
  type FinanceFormState,
} from "@/lib/actions/finance";
import { Button } from "@/components/ui/Button";

const initialState: FinanceFormState = null;

export function AllowanceAdjustmentForm() {
  const [state, formAction, pending] = useActionState(
    createAllowanceAdjustmentAction,
    initialState,
  );
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-4">
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
          <label htmlFor="aamount" className="field-label">
            Extra amount per month (ETB)
          </label>
          <input
            id="aamount"
            name="amount"
            type="number"
            min={0}
            step="0.01"
            required
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="astart" className="field-label">
            Starting month
          </label>
          <input
            id="astart"
            name="startMonth"
            type="date"
            defaultValue={today}
            className="field-input"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="areason" className="field-label">
            Reason
          </label>
          <input
            id="areason"
            name="reason"
            maxLength={200}
            required
            className="field-input"
            placeholder="e.g. new equipment, family event"
          />
        </div>
        <div>
          <label htmlFor="acount" className="field-label">
            Number of months
          </label>
          <input
            id="acount"
            name="monthsCount"
            type="number"
            min={1}
            max={24}
            step="1"
            defaultValue={1}
            className="field-input"
          />
        </div>
      </div>

      <div>
        <label htmlFor="anotes" className="field-label">
          Notes
        </label>
        <textarea
          id="anotes"
          name="notes"
          rows={2}
          maxLength={1000}
          className="field-input"
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Add adjustment"}
      </Button>
    </form>
  );
}
