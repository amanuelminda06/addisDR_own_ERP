"use client";

import { useActionState, useTransition } from "react";
import {
  saveWeeklyReportAction,
  submitWeeklyReportAction,
  reopenWeeklyReportAction,
  type WeeklyReportFormState,
} from "@/lib/actions/weekly-reports";
import { Button } from "@/components/ui/Button";

const initialState: WeeklyReportFormState = null;

export type WeeklyReportDefaults = {
  weekPlanId: string;
  summary: string;
  challenges: string;
  highlights: string;
  nextWeekGoals: string;
  needHelpWith: string;
  recipientName: string;
  recipientEmail: string;
};

function TextAreaField({
  name,
  heading,
  value,
  placeholder,
}: {
  name: string;
  heading: string;
  value: string;
  placeholder: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="field-label">
        {heading}
      </label>
      <textarea
        id={name}
        name={name}
        rows={4}
        defaultValue={value}
        maxLength={6000}
        className="field-input"
        placeholder={placeholder}
      />
    </div>
  );
}

export function WeeklyReportForm({
  defaults,
  numbersText,
  submitted,
}: {
  defaults: WeeklyReportDefaults;
  numbersText: string;
  submitted: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    saveWeeklyReportAction,
    initialState,
  );
  const [transitionPending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <div>
        <label className="field-label">Numbers (auto-populated)</label>
        <pre className="min-h-[7rem] whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          {numbersText}
        </pre>
        <p className="mt-1 text-xs text-slate-400">
          Pulled from Commercial, Finance, Daily Work and Tasks records for this
          week.
        </p>
      </div>

      <form action={formAction} className="space-y-5">
        <input type="hidden" name="weekPlanId" value={defaults.weekPlanId} />

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

        <div className="grid gap-5 lg:grid-cols-2">
          <TextAreaField
            name="summary"
            heading="Done this week"
            value={defaults.summary}
            placeholder="What was completed this week"
          />
          <TextAreaField
            name="challenges"
            heading="What didn't work / mistakes"
            value={defaults.challenges}
            placeholder="What went wrong, what you would change"
          />
          <TextAreaField
            name="highlights"
            heading="Key takeaways"
            value={defaults.highlights}
            placeholder="Lessons and insights"
          />
          <TextAreaField
            name="nextWeekGoals"
            heading="Next week's goals"
            value={defaults.nextWeekGoals}
            placeholder="What next week must achieve"
          />
          <TextAreaField
            name="needHelpWith"
            heading="Need help with"
            value={defaults.needHelpWith}
            placeholder="Support needed from your partner"
          />
          <div className="space-y-3">
            <div>
              <label className="field-label">Accountability partner</label>
              <input
                name="recipientName"
                defaultValue={defaults.recipientName}
                maxLength={120}
                className="field-input"
                placeholder="Partner name"
              />
            </div>
            <div>
              <label className="field-label">Partner email</label>
              <input
                name="recipientEmail"
                type="email"
                defaultValue={defaults.recipientEmail}
                className="field-input"
                placeholder="partner@example.com"
              />
            </div>
          </div>
        </div>

        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save draft"}
        </Button>
      </form>

      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        {submitted ? (
          <Button
            variant="outline"
            disabled={transitionPending}
            onClick={() =>
              startTransition(() => reopenWeeklyReportAction(defaults.weekPlanId))
            }
          >
            {transitionPending ? "Working…" : "Reopen for editing"}
          </Button>
        ) : (
          <Button
            variant="secondary"
            disabled={transitionPending}
            onClick={() =>
              startTransition(() => submitWeeklyReportAction(defaults.weekPlanId))
            }
          >
            {transitionPending ? "Working…" : "Submit to accountability partner"}
          </Button>
        )}
      </div>
    </div>
  );
}
