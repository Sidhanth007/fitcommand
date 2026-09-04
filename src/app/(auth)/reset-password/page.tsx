import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Reset password" };

export default async function ResetPasswordPage(props: PageProps<"/reset-password">) {
  const sp = await props.searchParams;
  const email = typeof sp.email === "string" ? sp.email : "";
  if (!email) redirect("/forgot-password");

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <KeyRound className="size-6" />
        </div>
        <CardTitle className="text-2xl">Set a new password</CardTitle>
        <CardDescription>
          If <span className="font-medium text-foreground">{email}</span> is registered, a 6-digit code is on its way.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm email={email} />
      </CardContent>
    </Card>
  );
}
