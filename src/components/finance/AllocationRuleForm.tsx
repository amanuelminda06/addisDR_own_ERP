"use client";

import { useActionState } from "react";
import {
  upsertAllocationRuleAction,
  type FinanceFormState,
} from "@/lib/actions/finance";
import { ALLOCATION_BASIS_LABELS } from "@/lib/labels";
import { ALLOCATION_BASES, ALLOCATION_METHODS } from "@/lib/validation";
import { Button } from "@/components/ui/Button";

const initialState: FinanceFormState = null;

export type AllocationRuleDefaults = {
  category: string;
  categoryLabel: string;
  method: string;
  value: string;
  basis: string;
  sequence: string;
  isActive: boolean;
};

export function AllocationRuleForm({
  defaults,
}: {
  defaults: AllocationRuleDefaults;
}) {
  const [state, formAction, pending] = useActionState(
    upsertAllocationRuleAction,
    initialState,
  );

  return (
    <form action={formAction} className="grid items-end gap-3 sm:grid-cols-12">
      <input type="hidden" name="category" value={defaults.category} />

      <div className="sm:col-span-2">
        <p className="field-label">Category</p>
        <p className="py-2 text-sm font-medium text-slate-800">
          {defaults.categoryLabel}
        </p>
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={`method-${defaults.category}`} className="field-label">
          Method
        </label>
        <select
          id={`method-${defaults.category}`}
          name="method"
          defaultValue={defaults.method}
          className="field-input"
        >
          {ALLOCATION_METHODS.map((m) => (
            <option key={m} value={m}>
              {m === "PERCENT" ? "Percent" : "Fixed ETB"}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={`value-${defaults.category}`} className="field-label">
          Value
        </label>
        <input
          id={`value-${defaults.category}`}
          name="value"
          type="number"
          min={0}
          step="0.01"
          defaultValue={defaults.value}
          className="field-input"
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={`basis-${defaults.category}`} className="field-label">
          Basis
        </label>
        <select
          id={`basis-${defaults.category}`}
          name="basis"
          defaultValue={defaults.basis}
          className="field-input"
        >
          {ALLOCATION_BASES.map((b) => (
            <option key={b} value={b}>
              {ALLOCATION_BASIS_LABELS[b]}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-1">
        <label htmlFor={`sequence-${defaults.category}`} className="field-label">
          Order
        </label>
        <input
          id={`sequence-${defaults.category}`}
          name="sequence"
          type="number"
          min={0}
          step="1"
          defaultValue={defaults.sequence}
          className="field-input"
        />
      </div>

      <div className="flex items-center gap-2 pb-2 sm:col-span-1">
        <input
          id={`active-${defaults.category}`}
          name="isActive"
          type="checkbox"
          defaultChecked={defaults.isActive}
          className="h-4 w-4 rounded border-slate-300"
        />
        <label
          htmlFor={`active-${defaults.category}`}
          className="text-xs text-slate-600"
        >
          Active
        </label>
      </div>

      <div className="sm:col-span-2">
        <Button type="submit" size="sm" disabled={pending} className="w-full">
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>

      {state?.error ? (
        <p className="text-xs text-red-600 sm:col-span-12">{state.error}</p>
      ) : null}
      {state?.success ? (
        <p className="text-xs text-emerald-600 sm:col-span-12">{state.success}</p>
      ) : null}
    </form>
  );
}
