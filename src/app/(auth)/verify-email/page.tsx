import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MailCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OtpForm } from "@/components/auth/otp-form";
import { verifyEmailAction } from "@/app/(auth)/actions";

export const metadata: Metadata = { title: "Verify email" };

export default async function VerifyEmailPage(props: PageProps<"/verify-email">) {
  const sp = await props.searchParams;
  const email = typeof sp.email === "string" ? sp.email : "";
  const reason = typeof sp.reason === "string" ? sp.reason : "";
  if (!email) redirect("/register");

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MailCheck className="size-6" />
        </div>
        <CardTitle className="text-2xl">Check your inbox</CardTitle>
        <CardDescription>
          {reason === "unverified" ? "Your email isn't verified yet. " : ""}
          We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>. It expires in 10 minutes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <OtpForm email={email} purpose="VERIFY_EMAIL" action={verifyEmailAction} submitLabel="Verify and continue" />
        <p className="text-center text-sm text-muted-foreground">
          Wrong email?{" "}
          <Link href="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
            Start over
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
