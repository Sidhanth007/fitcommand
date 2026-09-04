"use client";

import { useActionState, useEffect, useState } from "react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FormAlert } from "@/components/auth/form-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { resendCodeAction } from "@/app/(auth)/actions";
import { initialActionState, type ActionState } from "@/lib/validators/auth";
import type { ReactNode } from "react";

type Props = {
  email: string;
  purpose: "VERIFY_EMAIL" | "RESET_PASSWORD";
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  /** Extra fields rendered below the code input (e.g. new password fields). */
  children?: (state: ActionState) => ReactNode;
};

export function OtpForm({ email, purpose, action, submitLabel, children }: Props) {
  const [state, formAction] = useActionState(action, initialActionState);
  const [cooldown, setCooldown] = useState(0);
  const [resendState, resendAction] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await resendCodeAction(prev, formData);
    if (result.success) setCooldown(60);
    return result;
  }, initialActionState);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-5">
        <input type="hidden" name="email" value={email} />
        <FormAlert error={state.error} />
        <div className="space-y-2">
          <Label htmlFor="code">6-digit code</Label>
          <InputOTP id="code" name="code" maxLength={6} inputMode="numeric" pattern="\d*" autoFocus containerClassName="justify-center">
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} className="size-11 text-lg" />
              ))}
            </InputOTPGroup>
          </InputOTP>
          {state.fieldErrors?.code?.[0] && <p className="text-center text-xs text-destructive">{state.fieldErrors.code[0]}</p>}
        </div>
        {children?.(state)}
        <SubmitButton className="w-full" pendingText="Checking…">
          {submitLabel}
        </SubmitButton>
      </form>

      <form action={resendAction} className="space-y-2 text-center">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="purpose" value={purpose} />
        <FormAlert error={resendState.error} success={resendState.success} />
        <p className="text-sm text-muted-foreground">
          Didn&apos;t get the code? Check your spam folder or{" "}
          <Button type="submit" variant="link" size="sm" className="h-auto p-0" disabled={cooldown > 0}>
            {cooldown > 0 ? `resend in ${cooldown}s` : "resend it"}
          </Button>
          .
        </p>
      </form>
    </div>
  );
}
