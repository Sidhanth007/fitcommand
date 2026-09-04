"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { estimateCalories } from "@/lib/tracking/workouts";
import { dayAnchor, dayRange, toDayKey } from "@/lib/dates";
import { workoutLogSchema, type WorkoutLogInput } from "@/lib/validators/tracking";

export type SaveWorkoutResult = { ok: true; id: string } | { ok: false; error: string };

export async function saveWorkoutLogAction(input: WorkoutLogInput): Promise<SaveWorkoutResult> {
  const user = await requireUser();
  const parsed = workoutLogSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid workout data." };
  const d = parsed.data;

  const exerciseIds = [...new Set(d.exercises.map((e) => e.exerciseId))];
  const [exercises, profile] = await Promise.all([
    db.exercise.findMany({ where: { id: { in: exerciseIds } }, select: { id: true, metValue: true } }),
    db.profile.findUnique({ where: { userId: user.id }, select: { weightKg: true } }),
  ]);
  if (exercises.length !== exerciseIds.length) return { ok: false, error: "One of the exercises no longer exists." };

  const completedSets = d.exercises.flatMap((e) => e.sets.filter((s) => s.completed));
  if (completedSets.length === 0) return { ok: false, error: "Mark at least one set as completed." };

  const caloriesBurned = estimateCalories(
    exercises.map((e) => e.metValue),
    profile?.weightKg ?? 70,
    d.durationMin,
  );

  // Ensure the referenced plan/workout belongs to this user (or drop the link).
  let planId = d.planId ?? null;
  let planWorkoutId = d.planWorkoutId ?? null;
  if (planWorkoutId) {
    const pw = await db.planWorkout.findFirst({ where: { id: planWorkoutId, plan: { userId: user.id } }, select: { planId: true } });
    if (!pw) planWorkoutId = null;
    else planId = pw.planId;
  }

  // Backdated logs are anchored to local noon of the chosen day; future days are rejected.
  const todayKey = toDayKey();
  const dayKey = d.performedDayKey ?? todayKey;
  if (dayKey > todayKey) return { ok: false, error: "You can't log a workout for a future day." };
  const performedAt = dayKey === todayKey ? new Date() : dayAnchor(dayKey);

  const log = await db.workoutLog.create({
    data: {
      userId: user.id,
      performedAt,
      title: d.title,
      planId,
      planWorkoutId,
      durationMin: d.durationMin,
      rating: d.rating,
      notes: d.notes,
      caloriesBurned,
      sets: {
        create: d.exercises.flatMap((e) =>
          e.sets.map((s, i) => ({
            exerciseId: e.exerciseId,
            setNumber: i + 1,
            reps: s.reps,
            weightKg: s.weightKg,
            durationSec: s.durationSec,
            completed: s.completed,
          })),
        ),
      },
    },
    select: { id: true, performedAt: true },
  });

  // A logged workout cancels any "missed" mark for the same day.
  const { start: dayStart } = dayRange(toDayKey(log.performedAt));
  await db.workoutSkip.deleteMany({ where: { userId: user.id, date: dayStart } });

  revalidatePath("/workouts");
  revalidatePath("/dashboard");
  return { ok: true, id: log.id };
}

export async function deleteWorkoutLogAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const r = await db.workoutLog.deleteMany({ where: { id, userId: user.id } });
  if (r.count === 0) return { ok: false, error: "Workout not found." };
  revalidatePath("/workouts");
  revalidatePath("/dashboard");
  return { ok: true };
}
