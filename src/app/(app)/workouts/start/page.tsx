import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { WorkoutLogger } from "@/components/workouts/workout-logger";
import { requireOnboarded } from "@/lib/auth/onboarding";
import { db } from "@/lib/db";
import { getExerciseLibrary, getLastPerformance } from "@/lib/tracking/workouts";
import { suggestProgression } from "@/lib/engine/progression";
import { formatDateTime, isValidDayKey, recentDayOptions } from "@/lib/dates";

export const metadata: Metadata = { title: "Log session" };

export default async function StartWorkoutPage(props: PageProps<"/workouts/start">) {
  const [{ user }, sp] = await Promise.all([requireOnboarded(), props.searchParams]);
  const workoutId = typeof sp.workout === "string" ? sp.workout : "";
  if (!workoutId) redirect("/workouts");

  const [planWorkout, library] = await Promise.all([
    db.planWorkout.findFirst({
      where: { id: workoutId, plan: { userId: user.id } },
      include: { exercises: { orderBy: { order: "asc" }, include: { exercise: { select: { id: true, name: true, muscleGroup: true, equipment: true } } } } },
    }),
    getExerciseLibrary(),
  ]);
  if (!planWorkout) notFound();
  const dayOptions = recentDayOptions(14);
  const initialDayKey = isValidDayKey(sp.date) && dayOptions.some((d) => d.dayKey === sp.date) ? sp.date : dayOptions[0]!.dayKey;
  const last = await getLastPerformance(
    user.id,
    planWorkout.exercises.map((pe) => pe.exercise.id),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{planWorkout.title}</h1>
        <p className="text-muted-foreground">Tick each set as you finish it. A rest timer starts automatically.</p>
      </div>
      <DisclaimerBanner />
      <WorkoutLogger
        library={library}
        dayOptions={dayOptions}
        initialDayKey={initialDayKey}
        preset={{
          title: planWorkout.title,
          planId: planWorkout.planId,
          planWorkoutId: planWorkout.id,
          exercises: planWorkout.exercises.map((pe) => {
            const prev = last.get(pe.exercise.id);
            const prog = prev ? suggestProgression(pe.reps, prev.sets, pe.exercise.equipment === "BODYWEIGHT" || pe.exercise.muscleGroup === "CARDIO") : null;
            return {
              exerciseId: pe.exercise.id,
              name: pe.exercise.name,
              muscleGroup: pe.exercise.muscleGroup,
              sets: pe.sets,
              reps: pe.reps,
              restSeconds: pe.restSeconds,
              lastTime: prog ? `${prog.lastTime} · ${formatDateTime(prev!.performedAt)}` : undefined,
              suggestion: prog?.suggestion,
              suggestedWeightKg: prog?.suggestedWeightKg ?? null,
              suggestedReps: prog?.suggestedReps ?? null,
              suggestedDurationSec: prog?.suggestedDurationSec ?? null,
            };
          }),
        }}
      />
    </div>
  );
}
