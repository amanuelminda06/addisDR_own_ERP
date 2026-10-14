"use client";

import { useActionState } from "react";
import { updateProfileAction, type FormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";

const initialState: FormState = null;

const TIMEZONES = [
  "Africa/Addis_Ababa",
  "Africa/Nairobi",
  "Africa/Cairo",
  "Asia/Dubai",
  "Europe/London",
  "America/New_York",
  "UTC",
];

const CURRENCIES = ["ETB", "USD", "EUR", "GBP", "KES"];

export function ProfileForm({
  user,
}: {
  user: {
    name: string;
    username: string;
    email: string;
    timezone: string;
    currency: string;
    monthlyAllowance: string;
    accountabilityPartnerName: string | null;
    accountabilityPartnerEmail: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
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
          <label htmlFor="name" className="field-label">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            defaultValue={user.name}
            required
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="username" className="field-label">
            Username <span className="font-normal text-slate-400">(used to sign in)</span>
          </label>
          <input
            id="username"
            name="username"
            type="text"
            defaultValue={user.username}
            required
            minLength={3}
            maxLength={32}
            pattern="[a-zA-Z0-9._-]+"
            title="Letters, numbers, dots, underscores or hyphens"
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="email" className="field-label">
            Email <span className="font-normal text-slate-400">(read-only)</span>
          </label>
          <input
            id="email"
            type="email"
            defaultValue={user.email}
            disabled
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="timezone" className="field-label">
            Timezone
          </label>
          <select
            id="timezone"
            name="timezone"
            defaultValue={user.timezone}
            className="field-input"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="currency" className="field-label">
            Currency
          </label>
          <select
            id="currency"
            name="currency"
            defaultValue={user.currency}
            className="field-input"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="monthlyAllowance" className="field-label">
            Monthly personal allowance ({user.currency})
          </label>
          <input
            id="monthlyAllowance"
            name="monthlyAllowance"
            type="number"
            min={0}
            step="100"
            defaultValue={user.monthlyAllowance}
            required
            className="field-input"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="accountabilityPartnerName" className="field-label">
            Accountability partner name
          </label>
          <input
            id="accountabilityPartnerName"
            name="accountabilityPartnerName"
            type="text"
            defaultValue={user.accountabilityPartnerName ?? ""}
            className="field-input"
            placeholder="Friend who receives the weekly report"
          />
        </div>
        <div>
          <label htmlFor="accountabilityPartnerEmail" className="field-label">
            Accountability partner email
          </label>
          <input
            id="accountabilityPartnerEmail"
            name="accountabilityPartnerEmail"
            type="email"
            defaultValue={user.accountabilityPartnerEmail ?? ""}
            className="field-input"
            placeholder="partner@example.com"
          />
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
