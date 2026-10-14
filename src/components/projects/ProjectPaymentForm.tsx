"use client";

import { useActionState, useState } from "react";
import {
  createProjectPaymentAction,
  type ProjectFormState,
} from "@/lib/actions/projects";
import { PAYMENT_METHOD_LABELS } from "@/lib/labels";
import { PAYMENT_METHODS } from "@/lib/validation";
import { Button } from "@/components/ui/Button";

const initialState: ProjectFormState = null;

export function ProjectPaymentForm({
  projectId,
  milestones = [],
}: {
  projectId: string;
  milestones?: { id: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(createProjectPaymentAction, initialState);
  const [method, setMethod] = useState("");

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />
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

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="field-label">
            Amount (ETB) <span className="text-red-500">*</span>
          </label>
          <input
            name="amount"
            type="number"
            min="0"
            step="0.01"
            required
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">
            Received date <span className="text-red-500">*</span>
          </label>
          <input
            name="receivedAt"
            type="date"
            required
            defaultValue={today}
            className="field-input"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="field-label">Payment method</label>
          <select
            name="paymentMethod"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="field-input"
          >
            <option value="">— Not set —</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </option>
            ))}
          </select>
        </div>
        {milestones.length > 0 ? (
          <div>
            <label className="field-label">Apply to installment (optional)</label>
            <select name="milestoneId" defaultValue="" className="field-input">
              <option value="">— None —</option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <div>
        <label className="field-label">Reference / transaction no.</label>
        <input name="reference" maxLength={120} className="field-input" />
      </div>
      <div>
        <label className="field-label">Notes</label>
        <textarea name="notes" rows={2} maxLength={2000} className="field-input" />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          name="createFinanceEntry"
          value="true"
          defaultChecked
          className="h-4 w-4 rounded border-slate-300"
        />
        Record in finance system (income entry)
      </label>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Record payment"}
      </Button>
    </form>
  );
}
