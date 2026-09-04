"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { dayRange } from "@/lib/dates";
import { refreshNutritionTargets } from "@/lib/engine/plan-service";
import { checkInSchema } from "@/lib/validators/progress";
import type { ActionState } from "@/lib/validators/auth";

export async function saveCheckInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = checkInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Please check the highlighted fields.", fieldErrors: z.flattenError(parsed.error).fieldErrors as ActionState["fieldErrors"] };
  }
  const { dayKey, ...fields } = parsed.data;
  const { start } = dayRange(dayKey);

  // Keep any existing water value; only overwrite fields that were supplied.
  const data = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== null && v !== undefined));
  const cleared = Object.fromEntries(Object.entries(fields).filter(([, v]) => v === null).map(([k]) => [k, null]));

  await db.progressEntry.upsert({
    where: { userId_date: { userId: user.id, date: start } },
    update: { ...data, ...cleared },
    create: { userId: user.id, date: start, ...data },
  });

  // A new weight also updates the profile and recalculates targets.
  if (fields.weightKg != null) {
    const latest = await db.progressEntry.findFirst({ where: { userId: user.id, weightKg: { not: null } }, orderBy: { date: "desc" }, select: { date: true, weightKg: true } });
    if (latest && latest.date.getTime() === start.getTime()) {
      const profile = await db.profile.update({ where: { userId: user.id }, data: { weightKg: fields.weightKg } });
      await refreshNutritionTargets(profile);
    }
  }

  revalidatePath("/progress");
  revalidatePath("/dashboard");
  revalidatePath("/goals");
  return { success: "Check-in saved." };
}
