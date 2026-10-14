"use client";

import { useActionState } from "react";
import { setupAction, type FormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";

const initialState: FormState = null;

export function SetupForm() {
  const [state, formAction, pending] = useActionState(setupAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <div>
        <label htmlFor="name" className="field-label">
          Full name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="field-input"
          placeholder="Your name"
        />
      </div>

      <div>
        <label htmlFor="username" className="field-label">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          minLength={3}
          maxLength={32}
          pattern="[a-zA-Z0-9._-]+"
          title="Letters, numbers, dots, underscores or hyphens"
          className="field-input"
          placeholder="your-username"
        />
      </div>

      <div>
        <label htmlFor="email" className="field-label">
          Email <span className="font-normal text-slate-400">(for the profile)</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="field-input"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="field-label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="field-input"
          placeholder="At least 8 characters"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="field-label">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="field-input"
          placeholder="Repeat password"
        />
      </div>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating account…" : "Create owner account"}
      </Button>
    </form>
  );
}
