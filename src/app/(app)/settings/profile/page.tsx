import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm, type ProfileFormValues } from "@/components/profile/profile-form";
import { updateProfileAction } from "@/app/(app)/profile-actions";
import { requireOnboarded } from "@/lib/auth/onboarding";

export const metadata: Metadata = { title: "Profile settings" };

export default async function ProfileSettingsPage() {
  const { profile } = await requireOnboarded();

  const defaults: ProfileFormValues = {
    age: String(profile.age),
    sex: profile.sex,
    heightCm: String(profile.heightCm),
    weightKg: String(profile.weightKg),
    targetWeightKg: profile.targetWeightKg != null ? String(profile.targetWeightKg) : "",
    goal: profile.goal,
    activityLevel: profile.activityLevel,
    experience: profile.experience,
    daysPerWeek: String(profile.daysPerWeek),
    sessionMinutes: String(profile.sessionMinutes),
    equipment: profile.equipment,
    injuries: profile.injuries ?? "",
    dietaryPreference: profile.dietaryPreference,
    allergies: profile.allergies.join(", "),
    dislikedFoods: profile.dislikedFoods.join(", "),
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile &amp; preferences</h1>
        <p className="text-muted-foreground">Saving recalculates your calorie and macro targets. Tick the box at the bottom to also rebuild your plan.</p>
      </div>
      <Card>
        <CardHeader className="sr-only">
          <CardTitle>Edit profile</CardTitle>
          <CardDescription>Profile form</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <ProfileForm mode="edit" action={updateProfileAction} defaults={defaults} />
        </CardContent>
      </Card>
    </div>
  );
}
