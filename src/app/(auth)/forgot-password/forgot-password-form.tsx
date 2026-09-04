"use client";

import { useActionState } from "react";
import { forgotPasswordAction } from "@/app/(auth)/actions";
import { FormAlert } from "@/components/auth/form-alert";
import { FormField } from "@/components/auth/form-field";
import { SubmitButton } from "@/components/auth/submit-button";
import { initialActionState } from "@/lib/validators/auth";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(forgotPasswordAction, initialActionState);
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormAlert error={state.error} />
      <FormField label="Email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email} errors={state.fieldErrors?.email} required />
      <SubmitButton className="w-full" pendingText="Sending…">
        Send reset code
      </SubmitButton>
    </form>
  );
}
