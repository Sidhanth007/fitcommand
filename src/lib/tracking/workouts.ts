import "server-only";
import { db } from "@/lib/db";
import { dayRange } from "@/lib/dates";

export function getWorkoutHistory(userId: string, take = 30) {
  return db.workoutLog.findMany({
    where: { userId },
    orderBy: { performedAt: "desc" },
    take,
    include: { sets: { select: { reps: true, weightKg: true, completed: true } }, planWorkout: { select: { title: true } } },
  });
}

export function getWorkoutLog(userId: string, id: string) {
  return db.workoutLog.findFirst({
    where: { id, userId },
    include: {
      sets: { orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }], include: { exercise: { select: { id: true, name: true, muscleGroup: true } } } },
    },
  });
}

export async function getWorkoutsOnDay(userId: string, dayKey: string) {
  const { start, end } = dayRange(dayKey);
  return db.workoutLog.findMany({ where: { userId, performedAt: { gte: start, lt: end } }, select: { id: true, title: true, planWorkoutId: true, durationMin: true, caloriesBurned: true } });
}

export function getExerciseLibrary() {
  return db.exercise.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, muscleGroup: true, equipment: true, metValue: true } });
}

/** Volume in kg (sum of reps × weight for completed sets). */
export function workoutVolume(sets: { reps: number | null; weightKg: number | null; completed: boolean }[]) {
  return Math.round(sets.reduce((a, s) => (s.completed && s.reps && s.weightKg ? a + s.reps * s.weightKg : a), 0));
}

/** Estimated calories from average MET of the exercises performed. */
export function estimateCalories(mets: number[], weightKg: number, durationMin: number) {
  if (mets.length === 0 || durationMin <= 0) return 0;
  const avgMet = mets.reduce((a, b) => a + b, 0) / mets.length;
  return Math.round(avgMet * weightKg * (durationMin / 60));
}

/** Most recent completed performance per exercise (from the latest workout containing it). */
export async function getLastPerformance(userId: string, exerciseIds: string[]) {
  if (exerciseIds.length === 0) return new Map<string, { performedAt: Date; sets: { reps: number | null; weightKg: number | null; durationSec: number | null; completed: boolean }[] }>();
  const rows = await db.setLog.findMany({
    where: { exerciseId: { in: exerciseIds }, workoutLog: { userId } },
    orderBy: [{ workoutLog: { performedAt: "desc" } }, { setNumber: "asc" }],
    select: { exerciseId: true, reps: true, weightKg: true, durationSec: true, completed: true, workoutLogId: true, workoutLog: { select: { performedAt: true } } },
    take: 400,
  });
  const out = new Map<string, { performedAt: Date; workoutLogId: string; sets: { reps: number | null; weightKg: number | null; durationSec: number | null; completed: boolean }[] }>();
  for (const r of rows) {
    const cur = out.get(r.exerciseId);
    if (!cur) out.set(r.exerciseId, { performedAt: r.workoutLog.performedAt, workoutLogId: r.workoutLogId, sets: [r] });
    else if (cur.workoutLogId === r.workoutLogId) cur.sets.push(r);
  }
  return out;
}

/** Weekly stats for the last 7 days. */
export async function getWeeklyWorkoutStats(userId: string, todayKey: string) {
  const { end } = dayRange(todayKey);
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  const logs = await db.workoutLog.findMany({ where: { userId, performedAt: { gte: start, lt: end } }, select: { durationMin: true, caloriesBurned: true } });
  return {
    sessions: logs.length,
    minutes: logs.reduce((a, l) => a + l.durationMin, 0),
    calories: logs.reduce((a, l) => a + (l.caloriesBurned ?? 0), 0),
  };
}
