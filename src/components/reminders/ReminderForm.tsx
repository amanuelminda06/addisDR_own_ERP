"use client";

import { useActionState } from "react";
import {
  createReminderAction,
  type ReminderFormState,
} from "@/lib/actions/reminders";
import { REMINDER_TYPE_LABELS } from "@/lib/labels";
import { REMINDER_TYPES, REMINDER_CHANNELS } from "@/lib/validation";
import { Button } from "@/components/ui/Button";

const initialState: ReminderFormState = null;

const CHANNEL_LABELS: Record<string, string> = {
  IN_APP: "In-app",
  EMAIL: "Email (future)",
  SMS: "SMS (future)",
};

export function ReminderForm() {
  const [state, formAction, pending] = useActionState(
    createReminderAction,
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
          <label htmlFor="type" className="field-label">
            Type
          </label>
          <select id="type" name="type" className="field-input" defaultValue="CUSTOM">
            {REMINDER_TYPES.map((t) => (
              <option key={t} value={t}>
                {REMINDER_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="dueAt" className="field-label">
            Due (Addis Ababa time)
          </label>
          <input
            id="dueAt"
            name="dueAt"
            type="datetime-local"
            required
            className="field-input"
          />
        </div>
      </div>

      <div>
        <label htmlFor="title" className="field-label">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={200}
          className="field-input"
          placeholder="e.g. Follow up with client about proposal"
        />
      </div>

      <div>
        <label htmlFor="description" className="field-label">
          Description <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          maxLength={2000}
          className="field-input"
          placeholder="Any details about this reminder"
        />
      </div>

      <div>
        <label htmlFor="channel" className="field-label">
          Notification channel
        </label>
        <select id="channel" name="channel" className="field-input" defaultValue="IN_APP">
          {REMINDER_CHANNELS.map((c) => (
            <option key={c} value={c}>
              {CHANNEL_LABELS[c] ?? c}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add reminder"}
      </Button>
    </form>
  );
}
