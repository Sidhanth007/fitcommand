import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { ProfileForm } from "@/components/profile/profile-form";
import { completeOnboardingAction } from "@/app/(app)/profile-actions";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Set up your profile" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const profile = await db.profile.findUnique({ where: { userId: user.id } });
  if (profile?.onboardingDone) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Let&apos;s personalize your command center</h1>
        <p className="text-muted-foreground">Four quick steps. You can change any of this later in Settings.</p>
      </div>
      <DisclaimerBanner />
      <Card>
        <CardHeader className="sr-only">
          <CardTitle>Profile setup</CardTitle>
          <CardDescription>Onboarding form</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <ProfileForm mode="onboarding" action={completeOnboardingAction} />
        </CardContent>
      </Card>
    </div>
  );
}
