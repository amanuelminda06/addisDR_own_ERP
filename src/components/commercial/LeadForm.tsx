"use client";

import { useActionState, useState } from "react";
import {
  createLeadAction,
  updateLeadAction,
  type CommercialFormState,
} from "@/lib/actions/commercial";
import { LEAD_STATUS_LABELS, LEAD_PRIORITY_LABELS } from "@/lib/labels";
import { LEAD_STATUSES, LEAD_PRIORITIES } from "@/lib/validation";
import { Button } from "@/components/ui/Button";

const initialState: CommercialFormState = null;

export type LeadFormDefaults = {
  id: string;
  name: string;
  contactName: string;
  company: string;
  email: string;
  phone: string;
  category: string;
  area: string;
  address: string;
  source: string;
  status: string;
  priority: string;
  estimatedValue: string;
  probability: string;
  expectedCloseAt: string;
  nextAction: string;
  nextActionAt: string;
  notes: string;
  lostReason: string;
  marketingActivityId: string;
};

export type MarketingActivityOption = { id: string; name: string };

export function LeadForm({
  mode,
  defaults,
  activities,
  allowedStatuses,
}: {
  mode: "create" | "edit";
  defaults: LeadFormDefaults;
  activities: MarketingActivityOption[];
  allowedStatuses: string[];
}) {
  const action = mode === "create" ? createLeadAction : updateLeadAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [status, setStatus] = useState(defaults.status);

  return (
    <form action={formAction} className="space-y-5">
      {defaults.id ? <input type="hidden" name="id" value={defaults.id} /> : null}

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
            Lead name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={160}
            defaultValue={defaults.name}
            className="field-input"
            placeholder="e.g. Bright Future School"
          />
        </div>
        <div>
          <label htmlFor="contactName" className="field-label">
            Contact person
          </label>
          <input
            id="contactName"
            name="contactName"
            maxLength={160}
            defaultValue={defaults.contactName}
            className="field-input"
            placeholder="Who to talk to"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="company" className="field-label">
            Company / organisation
          </label>
          <input
            id="company"
            name="company"
            maxLength={160}
            defaultValue={defaults.company}
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="category" className="field-label">
            Category / industry
          </label>
          <input
            id="category"
            name="category"
            maxLength={80}
            defaultValue={defaults.category}
            className="field-input"
            placeholder="e.g. Education, Retail"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className="field-label">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={defaults.email}
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="phone" className="field-label">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            maxLength={40}
            defaultValue={defaults.phone}
            className="field-input"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="area" className="field-label">
            Area / location
          </label>
          <input
            id="area"
            name="area"
            maxLength={80}
            defaultValue={defaults.area}
            className="field-input"
            placeholder="e.g. Bole, Addis Ababa"
          />
        </div>
        <div>
          <label htmlFor="address" className="field-label">
            Address
          </label>
          <input
            id="address"
            name="address"
            maxLength={200}
            defaultValue={defaults.address}
            className="field-input"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="source" className="field-label">
            Source
          </label>
          <input
            id="source"
            name="source"
            maxLength={80}
            defaultValue={defaults.source}
            className="field-input"
            placeholder="Referral, walk-in, campaign…"
          />
        </div>
        <div>
          <label htmlFor="marketingActivityId" className="field-label">
            Marketing activity
          </label>
          <select
            id="marketingActivityId"
            name="marketingActivityId"
            defaultValue={defaults.marketingActivityId}
            className="field-input"
          >
            <option value="">— Not attributed —</option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="status" className="field-label">
            Pipeline stage
          </label>
          <select
            id="status"
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="field-input"
          >
            {LEAD_STATUSES.filter(
              (s) => allowedStatuses.includes(s) || s === defaults.status,
            ).map((s) => (
              <option key={s} value={s}>
                {LEAD_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="priority" className="field-label">
            Priority
          </label>
          <select
            id="priority"
            name="priority"
            defaultValue={defaults.priority}
            className="field-input"
          >
            {LEAD_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {LEAD_PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {status === "LOST" ? (
        <div>
          <label htmlFor="lostReason" className="field-label">
            Lost reason
          </label>
          <input
            id="lostReason"
            name="lostReason"
            maxLength={400}
            defaultValue={defaults.lostReason}
            className="field-input"
            placeholder="Why was this opportunity lost?"
          />
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="estimatedValue" className="field-label">
            Estimated value (ETB)
          </label>
          <input
            id="estimatedValue"
            name="estimatedValue"
            type="number"
            min={0}
            step="0.01"
            defaultValue={defaults.estimatedValue}
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="probability" className="field-label">
            Probability (%)
          </label>
          <input
            id="probability"
            name="probability"
            type="number"
            min={0}
            max={100}
            defaultValue={defaults.probability}
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="expectedCloseAt" className="field-label">
            Expected close
          </label>
          <input
            id="expectedCloseAt"
            name="expectedCloseAt"
            type="date"
            defaultValue={defaults.expectedCloseAt}
            className="field-input"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="nextAction" className="field-label">
            Next action
          </label>
          <input
            id="nextAction"
            name="nextAction"
            maxLength={200}
            defaultValue={defaults.nextAction}
            className="field-input"
            placeholder="e.g. Send revised proposal"
          />
        </div>
        <div>
          <label htmlFor="nextActionAt" className="field-label">
            Next action at
          </label>
          <input
            id="nextActionAt"
            name="nextActionAt"
            type="datetime-local"
            defaultValue={defaults.nextActionAt}
            className="field-input"
          />
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="field-label">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={4000}
          defaultValue={defaults.notes}
          className="field-input"
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending
          ? "Saving…"
          : mode === "create"
            ? "Create lead"
            : "Save changes"}
      </Button>
    </form>
  );
}
