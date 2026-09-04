"use client";

import { useActionState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormAlert } from "@/components/auth/form-alert";
import { FormField } from "@/components/auth/form-field";
import { SubmitButton } from "@/components/auth/submit-button";
import { changePasswordAction, deleteAccountAction } from "./actions";
import { initialActionState } from "@/lib/validators/auth";

export function AccountForms({ isAdmin, email }: { isAdmin: boolean; email: string }) {
  const [pw, pwAction] = useActionState(changePasswordAction, initialActionState);
  const [del, delAction] = useActionState(deleteAccountAction, initialActionState);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change password</CardTitle>
          <CardDescription>At least 8 characters with a letter and a number.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={pwAction} className="space-y-3" noValidate>
            <FormAlert error={pw.error} success={pw.success} />
            <FormField label="Current password" name="currentPassword" type="password" autoComplete="current-password" errors={pw.fieldErrors?.currentPassword} required />
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="New password" name="password" type="password" autoComplete="new-password" errors={pw.fieldErrors?.password} required />
              <FormField label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" errors={pw.fieldErrors?.confirmPassword} required />
            </div>
            <SubmitButton pendingText="Updating…">Update password</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Delete account</CardTitle>
          <CardDescription>{isAdmin ? "The administrator account can't be deleted from here." : "Permanently removes your profile, plans, logs, goals, reminders and chat history. This cannot be undone."}</CardDescription>
        </CardHeader>
        {!isAdmin && (
          <CardContent>
            <form action={delAction} className="space-y-3" noValidate>
              <FormAlert error={del.error} />
              <FormField label={`Type your email (${email}) to confirm`} name="confirmEmail" autoComplete="off" errors={del.fieldErrors?.confirmEmail} required />
              <FormField label="Password" name="password" type="password" autoComplete="current-password" errors={del.fieldErrors?.password} required />
              <SubmitButton variant="destructive" pendingText="Deleting…">
                Delete my account
              </SubmitButton>
            </form>
          </CardContent>
        )}
      </Card>
    </>
  );
}
