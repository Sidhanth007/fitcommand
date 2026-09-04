import "server-only";
import { db } from "@/lib/db";
import { calcNutrition } from "@/lib/engine/nutrition";
import { generatePlan, type EngineTemplate, type TemplateSession } from "@/lib/engine/workout";
import type { Profile } from "@/generated/prisma/client";

/** Recalculate and persist nutrition targets from the profile. */
export async function refreshNutritionTargets(profile: Profile) {
  const n = calcNutrition(profile);
  return db.nutritionTarget.upsert({
    where: { userId: profile.userId },
    update: { bmr: n.bmr, tdee: n.tdee, calories: n.calories, proteinG: n.proteinG, carbsG: n.carbsG, fatG: n.fatG, waterMl: n.waterMl },
    create: {
      userId: profile.userId,
      bmr: n.bmr,
      tdee: n.tdee,
      calories: n.calories,
      proteinG: n.proteinG,
      carbsG: n.carbsG,
      fatG: n.fatG,
      waterMl: n.waterMl,
    },
  });
}

/** Generate a new weekly plan from templates + exercise library and make it the active plan. */
export async function regenerateFitnessPlan(profile: Profile) {
  const [templates, library] = await Promise.all([
    db.planTemplate.findMany({ where: { isActive: true } }),
    db.exercise.findMany({ where: { isActive: true }, select: { id: true, name: true, muscleGroup: true, equipment: true, difficulty: true } }),
  ]);

  const engineTemplates: EngineTemplate[] = templates.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    goal: t.goal,
    experience: t.experience,
    daysPerWeek: t.daysPerWeek,
    structure: t.structure as TemplateSession[],
  }));

  const plan = generatePlan(engineTemplates, library, {
    goal: profile.goal,
    experience: profile.experience,
    daysPerWeek: profile.daysPerWeek,
    sessionMinutes: profile.sessionMinutes,
    equipment: profile.equipment,
  });
  if (!plan) throw new Error("No plan templates available. Ask the administrator to add one.");

  const previous = await db.fitnessPlan.findFirst({ where: { userId: profile.userId, isActive: true }, orderBy: { createdAt: "desc" } });

  return db.$transaction(async (tx) => {
    await tx.fitnessPlan.updateMany({ where: { userId: profile.userId, isActive: true }, data: { isActive: false } });
    return tx.fitnessPlan.create({
      data: {
        userId: profile.userId,
        title: plan.title,
        summary: plan.summary,
        weekNumber: (previous?.weekNumber ?? 0) + 1,
        workouts: {
          create: plan.workouts.map((w, wi) => ({
            dayOfWeek: w.dayOfWeek,
            title: w.title,
            focus: w.focus,
            estMinutes: w.estMinutes,
            order: wi,
            exercises: {
              create: w.exercises.map((e, ei) => ({
                exerciseId: e.exerciseId,
                sets: e.sets,
                reps: e.reps,
                restSeconds: e.restSeconds,
                notes: e.notes,
                order: ei,
              })),
            },
          })),
        },
      },
    });
  });
}

/** Load the active plan with workouts + exercises for display. */
export function getActivePlan(userId: string) {
  return db.fitnessPlan.findFirst({
    where: { userId, isActive: true },
    orderBy: { createdAt: "desc" },
    include: {
      workouts: {
        orderBy: { dayOfWeek: "asc" },
        include: { exercises: { orderBy: { order: "asc" }, include: { exercise: true } } },
      },
    },
  });
}

export type ActivePlan = NonNullable<Awaited<ReturnType<typeof getActivePlan>>>;
