"use client";

import { useActionState, useState } from "react";
import {
  createExpenseEntryAction,
  updateExpenseEntryAction,
  type FinanceFormState,
} from "@/lib/actions/finance";
import { PAYMENT_METHOD_LABELS } from "@/lib/labels";
import { PAYMENT_METHODS } from "@/lib/validation";
import { BUSINESS_EXPENSE_CATEGORIES, PERSONAL_EXPENSE_CATEGORIES } from "@/lib/constants";
import { Button } from "@/components/ui/Button";

const initialState: FinanceFormState = null;

export type ExpenseDefaults = {
  id: string;
  category: string;
  amount: string;
  occurredAt: string;
  expenseClass: string;
  paymentMethod: string;
  projectId: string;
  reference: string;
  description: string;
  notes: string;
};

export function ExpenseForm({
  mode,
  defaults,
  projects,
}: {
  mode: "create" | "edit";
  defaults: ExpenseDefaults;
  projects: { id: string; name: string }[];
}) {
  const action = mode === "create" ? createExpenseEntryAction : updateExpenseEntryAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [expenseClass, setExpenseClass] = useState(
    defaults.expenseClass || "BUSINESS",
  );

  return (
    <form action={formAction} className="space-y-5">
      {defaults.id ? <input type="hidden" name="id" value={defaults.id} /> : null}
      <input type="hidden" name="type" value="EXPENSE" />

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

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="expenseClass" className="field-label">
            Expense type
          </label>
          <select
            id="expenseClass"
            name="expenseClass"
            value={expenseClass}
            onChange={(e) => setExpenseClass(e.target.value)}
            className="field-input"
          >
            <option value="BUSINESS">Business</option>
            <option value="PERSONAL">Personal</option>
          </select>
        </div>
        <div>
          <label htmlFor="category" className="field-label">
            Category <span className="text-red-500">*</span>
          </label>
          <input
            id="category"
            name="category"
            list="expense-categories"
            required
            maxLength={120}
            defaultValue={defaults.category}
            className="field-input"
          />
          <datalist id="expense-categories">
            {categoryOptionsFor(expenseClass).map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label htmlFor="amount" className="field-label">
            Amount (ETB) <span className="text-red-500">*</span>
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={defaults.amount}
            className="field-input"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="occurredAt" className="field-label">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            id="occurredAt"
            name="occurredAt"
            type="date"
            required
            defaultValue={defaults.occurredAt}
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="paymentMethod" className="field-label">
            Payment method
          </label>
          <select
            id="paymentMethod"
            name="paymentMethod"
            defaultValue={defaults.paymentMethod}
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
        <div>
          <label htmlFor="projectId" className="field-label">
            Project (optional)
          </label>
          <select
            id="projectId"
            name="projectId"
            defaultValue={defaults.projectId}
            className="field-input"
          >
            <option value="">— None —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="description" className="field-label">
          Description
        </label>
        <input
          id="description"
          name="description"
          maxLength={400}
          defaultValue={defaults.description}
          className="field-input"
        />
      </div>

      <div>
        <label htmlFor="notes" className="field-label">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={2000}
          defaultValue={defaults.notes}
          className="field-input"
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : defaults.id ? "Save expense" : "Record expense"}
      </Button>
    </form>
  );
}

function categoryOptionsFor(expenseClass: string): readonly string[] {
  return expenseClass === "PERSONAL"
    ? PERSONAL_EXPENSE_CATEGORIES
    : BUSINESS_EXPENSE_CATEGORIES;
}
