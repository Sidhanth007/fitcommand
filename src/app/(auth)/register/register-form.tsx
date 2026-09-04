"use client";

import { useActionState } from "react";
import { registerAction } from "@/app/(auth)/actions";
import { FormAlert } from "@/components/auth/form-alert";
import { FormField } from "@/components/auth/form-field";
import { SubmitButton } from "@/components/auth/submit-button";
import { Label } from "@/components/ui/label";
import { AI_DISCLAIMER_SHORT } from "@/lib/constants";
import { initialActionState } from "@/lib/validators/auth";

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initialActionState);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormAlert error={state.error} />
      <FormField label="Full name" name="name" autoComplete="name" defaultValue={state.values?.name} errors={fe.name} required />
      <FormField label="Email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email} errors={fe.email} required />
      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        errors={fe.password}
        hint="At least 8 characters with a letter and a number."
        required
      />
      <FormField label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" errors={fe.confirmPassword} required />

      <div className="space-y-1.5">
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="acceptTerms" className="mt-0.5 size-4 rounded border-input accent-primary" />
          <span className="text-muted-foreground">
            I understand this is an <span className="font-medium text-foreground">AI-powered demo</span> — {AI_DISCLAIMER_SHORT.toLowerCase()}
          </span>
        </label>
        {fe.acceptTerms?.[0] && <p className="text-xs text-destructive">{fe.acceptTerms[0]}</p>}
      </div>

      <SubmitButton className="w-full" pendingText="Creating account…">
        Create account
      </SubmitButton>
      <Label className="sr-only">Registration form</Label>
    </form>
  );
}
