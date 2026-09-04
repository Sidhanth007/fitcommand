"use client";

import { resetPasswordAction } from "@/app/(auth)/actions";
import { FormField } from "@/components/auth/form-field";
import { OtpForm } from "@/components/auth/otp-form";

export function ResetPasswordForm({ email }: { email: string }) {
  return (
    <OtpForm email={email} purpose="RESET_PASSWORD" action={resetPasswordAction} submitLabel="Reset password">
      {(state) => (
        <div className="space-y-4">
          <FormField
            label="New password"
            name="password"
            type="password"
            autoComplete="new-password"
            errors={state.fieldErrors?.password}
            hint="At least 8 characters with a letter and a number."
            required
          />
          <FormField label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" errors={state.fieldErrors?.confirmPassword} required />
        </div>
      )}
    </OtpForm>
  );
}
