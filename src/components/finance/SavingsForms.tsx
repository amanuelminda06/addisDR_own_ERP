"use client";

import { useActionState } from "react";
import {
  createSavingsTransactionAction,
  upsertSavingsAccountAction,
  type FinanceFormState,
} from "@/lib/actions/finance";
import {
  SAVINGS_FUND_LABELS,
  SAVINGS_TRANSACTION_LABELS,
} from "@/lib/labels";
import {
  SAVINGS_FUNDS,
  SAVINGS_TRANSACTION_TYPES,
} from "@/lib/validation";
import { Button } from "@/components/ui/Button";

const initialState: FinanceFormState = null;

export function SavingsTransactionForm() {
  const [state, formAction, pending] = useActionState(
    createSavingsTransactionAction,
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

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="fund" className="field-label">
            Fund
          </label>
          <select id="fund" name="fund" className="field-input">
            {SAVINGS_FUNDS.map((f) => (
              <option key={f} value={f}>
                {SAVINGS_FUND_LABELS[f]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="stype" className="field-label">
            Type
          </label>
          <select id="stype" name="type" className="field-input">
            {SAVINGS_TRANSACTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {SAVINGS_TRANSACTION_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="samount" className="field-label">
            Amount (ETB)
          </label>
          <input
            id="samount"
            name="amount"
            type="number"
            min={0}
            step="0.01"
            required
            className="field-input"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="sdate" className="field-label">
            Date
          </label>
          <input
            id="sdate"
            name="occurredAt"
            type="date"
            defaultValue={today}
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="sreason" className="field-label">
            Reason
          </label>
          <input
            id="sreason"
            name="reason"
            maxLength={200}
            className="field-input"
          />
        </div>
      </div>

      <div>
        <label htmlFor="snotes" className="field-label">
          Notes
        </label>
        <textarea
          id="snotes"
          name="notes"
          rows={2}
          maxLength={1000}
          className="field-input"
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Recording…" : "Record transaction"}
      </Button>
    </form>
  );
}

export function SavingsAccountForm({
  fund,
  name,
  openingBalance,
}: {
  fund: string;
  name: string;
  openingBalance: string;
}) {
  const [state, formAction, pending] = useActionState(
    upsertSavingsAccountAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="fund" value={fund} />
      <input type="hidden" name="name" value={name} />
      <div>
        <label htmlFor={`opening-${fund}`} className="field-label">
          Opening balance (ETB)
        </label>
        <input
          id={`opening-${fund}`}
          name="openingBalance"
          type="number"
          min={0}
          step="0.01"
          defaultValue={openingBalance}
          className="field-input w-40"
        />
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Saving…" : "Save opening"}
      </Button>
      {state?.error ? (
        <p className="text-xs text-red-600">{state.error}</p>
      ) : null}
    </form>
  );
}
