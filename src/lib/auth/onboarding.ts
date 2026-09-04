import "server-only";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, type SessionUser } from "@/lib/auth/session";
import type { NutritionTarget, Profile } from "@/generated/prisma/client";

/** For app pages: requires a logged-in, verified user who has completed onboarding. */
export async function requireOnboarded(): Promise<{ user: SessionUser; profile: Profile; targets: NutritionTarget | null }> {
  const user = await requireUser();
  const profile = await db.profile.findUnique({ where: { userId: user.id } });
  if (!profile || !profile.onboardingDone) redirect("/onboarding");
  const targets = await db.nutritionTarget.findUnique({ where: { userId: user.id } });
  return { user, profile, targets };
}
