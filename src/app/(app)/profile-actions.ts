"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { refreshNutritionTargets, regenerateFitnessPlan } from "@/lib/engine/plan-service";
import { formDataToProfile, profileSchema } from "@/lib/validators/profile";
import type { ActionState } from "@/lib/validators/auth";
import type { DietaryPreference, Equipment } from "@/generated/prisma/enums";
import type { Profile } from "@/generated/prisma/client";

function fieldErrorsOf(error: z.ZodError) {
  return z.flattenError(error).fieldErrors as ActionState["fieldErrors"];
}

type SaveResult = { ok: false; error: z.ZodError } | { ok: true; profile: Profile };

async function saveProfile(userId: string, formData: FormData): Promise<SaveResult> {
  const parsed = profileSchema.safeParse(formDataToProfile(formData));
  if (!parsed.success) return { ok: false, error: parsed.error as z.ZodError };
  const d = parsed.data;
  const data = {
    age: d.age,
    sex: d.sex,
    heightCm: d.heightCm,
    weightKg: d.weightKg,
    targetWeightKg: d.targetWeightKg,
    goal: d.goal,
    activityLevel: d.activityLevel,
    experience: d.experience,
    daysPerWeek: d.daysPerWeek,
    sessionMinutes: d.sessionMinutes,
    equipment: d.equipment as Equipment[],
    injuries: d.injuries,
    dietaryPreference: d.dietaryPreference as DietaryPreference,
    allergies: d.allergies,
    dislikedFoods: d.dislikedFoods,
    onboardingDone: true,
  };
  const profile = await db.profile.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
  return { ok: true, profile };
}

export async function completeOnboardingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const result = await saveProfile(user.id, formData);
  if (!result.ok) return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsOf(result.error) };

  await refreshNutritionTargets(result.profile);
  try {
    await regenerateFitnessPlan(result.profile);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not generate a plan." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard?welcome=1");
}

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const result = await saveProfile(user.id, formData);
  if (!result.ok) return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsOf(result.error) };

  await refreshNutritionTargets(result.profile);
  const regenerate = formData.get("regenerate") === "on";
  if (regenerate) {
    try {
      await regenerateFitnessPlan(result.profile);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Could not regenerate the plan." };
    }
  }

  revalidatePath("/", "layout");
  return { success: regenerate ? "Profile saved, targets updated and a new plan generated." : "Profile saved and targets updated." };
}

export async function completeTourAction(): Promise<{ ok: boolean }> {
  const user = await requireUser();
  await db.profile.updateMany({ where: { userId: user.id, tourDoneAt: null }, data: { tourDoneAt: new Date() } });
  return { ok: true };
}

export async function regeneratePlanAction(): Promise<{ ok: boolean; message: string }> {
  const user = await requireUser();
  const profile = await db.profile.findUnique({ where: { userId: user.id } });
  if (!profile) return { ok: false, message: "Complete onboarding first." };
  try {
    await regenerateFitnessPlan(profile);
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Could not regenerate the plan." };
  }
  revalidatePath("/dashboard");
  revalidatePath("/plan");
  return { ok: true, message: "A fresh weekly plan is ready." };
}
