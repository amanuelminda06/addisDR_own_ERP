"use client";

import { useActionState } from "react";
import {
  createBusinessInvestmentAction,
  type FinanceFormState,
} from "@/lib/actions/finance";
import { Button } from "@/components/ui/Button";

const initialState: FinanceFormState = null;

export function BusinessInvestmentForm({
  projects,
}: {
  projects: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    createBusinessInvestmentAction,
    initialState,
  );

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
          <label htmlFor="purpose" className="field-label">
            Purpose <span className="text-red-500">*</span>
          </label>
          <input
            id="purpose"
            name="purpose"
            maxLength={200}
            required
            className="field-input"
            placeholder="e.g. buy delivery motorcycle"
          />
        </div>
        <div>
          <label htmlFor="plannedAmount" className="field-label">
            Planned amount (ETB) <span className="text-red-500">*</span>
          </label>
          <input
            id="plannedAmount"
            name="plannedAmount"
            type="number"
            min={0}
            step="0.01"
            required
            className="field-input"
          />
        </div>
      </div>

      <div>
        <label htmlFor="expectedBenefit" className="field-label">
          Expected benefit
        </label>
        <input
          id="expectedBenefit"
          name="expectedBenefit"
          maxLength={500}
          className="field-input"
          placeholder="What this investment should bring back"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="invprojectId" className="field-label">
            Linked project (optional)
          </label>
          <select id="invprojectId" name="projectId" className="field-input">
            <option value="">— None —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="invnotes" className="field-label">
            Notes
          </label>
          <input
            id="invnotes"
            name="notes"
            maxLength={2000}
            className="field-input"
          />
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Plan investment"}
      </Button>
    </form>
  );
}
