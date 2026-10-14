"use client";

import { useActionState, useState } from "react";
import {
  createIncomeEntryAction,
  updateIncomeEntryAction,
  type FinanceFormState,
} from "@/lib/actions/finance";
import { PAYMENT_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/labels";
import { PAYMENT_STATUSES, PAYMENT_METHODS } from "@/lib/validation";
import { INCOME_CATEGORIES } from "@/lib/constants";
import { Button } from "@/components/ui/Button";

const initialState: FinanceFormState = null;

export type IncomeDefaults = {
  id: string;
  category: string;
  amount: string;
  occurredAt: string;
  paymentStatus: string;
  amountReceived: string;
  paymentMethod: string;
  projectId: string;
  clientId: string;
  reference: string;
  dueDate: string;
  description: string;
  notes: string;
};

export function IncomeForm({
  mode,
  defaults,
  projects,
  clients,
}: {
  mode: "create" | "edit";
  defaults: IncomeDefaults;
  projects: { id: string; name: string }[];
  clients: { id: string; name: string }[];
}) {
  const action = mode === "create" ? createIncomeEntryAction : updateIncomeEntryAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [status, setStatus] = useState(defaults.paymentStatus || "RECEIVED");

  return (
    <form action={formAction} className="space-y-5">
      {defaults.id ? <input type="hidden" name="id" value={defaults.id} /> : null}
      <input type="hidden" name="type" value="INCOME" />

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
          <label htmlFor="category" className="field-label">
            Income category <span className="text-red-500">*</span>
          </label>
          <input
            id="category"
            name="category"
            list="income-categories"
            required
            maxLength={120}
            defaultValue={defaults.category}
            className="field-input"
            placeholder="Project payment, retainer…"
          />
          <datalist id="income-categories">
            {INCOME_CATEGORIES.map((c) => (
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
          <label htmlFor="paymentStatus" className="field-label">
            Payment status
          </label>
          <select
            id="paymentStatus"
            name="paymentStatus"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="field-input"
          >
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PAYMENT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
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
      </div>

      {status === "PARTIAL" ? (
        <div>
          <label htmlFor="amountReceived" className="field-label">
            Amount received so far (ETB) <span className="text-red-500">*</span>
          </label>
          <input
            id="amountReceived"
            name="amountReceived"
            type="number"
            min={0}
            step="0.01"
            defaultValue={defaults.amountReceived}
            className="field-input"
          />
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
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
        <div>
          <label htmlFor="clientId" className="field-label">
            Client
          </label>
          <select
            id="clientId"
            name="clientId"
            defaultValue={defaults.clientId}
            className="field-input"
          >
            <option value="">— None —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="reference" className="field-label">
            Reference / invoice no.
          </label>
          <input
            id="reference"
            name="reference"
            maxLength={120}
            defaultValue={defaults.reference}
            className="field-input"
            placeholder="Used to prevent duplicates"
          />
        </div>
        <div>
          <label htmlFor="dueDate" className="field-label">
            Due date
          </label>
          <input
            id="dueDate"
            name="dueDate"
            type="date"
            defaultValue={defaults.dueDate}
            className="field-input"
          />
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
        {pending ? "Saving…" : defaults.id ? "Save income" : "Record income"}
      </Button>
    </form>
  );
}
