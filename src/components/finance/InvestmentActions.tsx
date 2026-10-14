"use client";

import { useActionState, useTransition } from "react";
import {
  decideBusinessInvestmentAction,
  recordInvestmentExpenseAction,
  type FinanceFormState,
} from "@/lib/actions/finance";
import { PAYMENT_METHOD_LABELS } from "@/lib/labels";
import { PAYMENT_METHODS } from "@/lib/validation";
import { Button } from "@/components/ui/Button";

const initialState: FinanceFormState = null;

export function InvestmentActions({
  investmentId,
  decision,
  hasExpense,
}: {
  investmentId: string;
  decision: string;
  hasExpense: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [state, formAction, spendPending] = useActionState(
    recordInvestmentExpenseAction,
    initialState,
  );
  const today = new Date().toISOString().slice(0, 10);

  const canApprove = decision === "PENDING";
  const canRecord = decision === "APPROVED" && !hasExpense;

  return (
    <div className="space-y-3">
      {canApprove ? (
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(() =>
                decideBusinessInvestmentAction(investmentId, "APPROVED"),
              )
            }
          >
            Approve
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(() =>
                decideBusinessInvestmentAction(investmentId, "REJECTED"),
              )
            }
          >
            Reject
          </Button>
        </div>
      ) : null}

      {canRecord ? (
        <form action={formAction} className="space-y-2">
          <input type="hidden" name="investmentId" value={investmentId} />
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label htmlFor={`actual-${investmentId}`} className="field-label">
                Actual spend (ETB)
              </label>
              <input
                id={`actual-${investmentId}`}
                name="actualAmount"
                type="number"
                min={0}
                step="0.01"
                required
                className="field-input w-32"
              />
            </div>
            <div>
              <label htmlFor={`spend-${investmentId}`} className="field-label">
                Date
              </label>
              <input
                id={`spend-${investmentId}`}
                name="spendDate"
                type="date"
                defaultValue={today}
                className="field-input"
              />
            </div>
            <div>
              <label htmlFor={`pm-${investmentId}`} className="field-label">
                Method
              </label>
              <select
                id={`pm-${investmentId}`}
                name="paymentMethod"
                className="field-input w-32"
              >
                <option value="">—</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_METHOD_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" size="sm" variant="outline" disabled={spendPending}>
              {spendPending ? "Saving…" : "Record spend"}
            </Button>
          </div>
          {state?.error ? (
            <p className="text-xs text-red-600">{state.error}</p>
          ) : null}
          {state?.success ? (
            <p className="text-xs text-emerald-600">{state.success}</p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
