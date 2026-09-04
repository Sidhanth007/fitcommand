import "server-only";
import { db } from "@/lib/db";
import { dayRange, shiftDayKey, toDayKey } from "@/lib/dates";

export type WeightPoint = { dayKey: string; weightKg: number; avg7: number | null };

export async function getProgressEntries(userId: string, todayKey: string, days: number) {
  const firstKey = shiftDayKey(todayKey, -(days - 1));
  const { start } = dayRange(firstKey);
  const { end } = dayRange(todayKey);
  return db.progressEntry.findMany({ where: { userId, date: { gte: start, lt: end } }, orderBy: { date: "asc" } });
}

export async function getEntryForDay(userId: string, dayKey: string) {
  const { start } = dayRange(dayKey);
  return db.progressEntry.findUnique({ where: { userId_date: { userId, date: start } } });
}

/** All weight points (any range) with a trailing 7-entry moving average. */
export function weightSeries(entries: { date: Date; weightKg: number | null }[]): WeightPoint[] {
  const pts = entries.filter((e) => e.weightKg != null).map((e) => ({ dayKey: toDayKey(new Date(e.date.getTime() + 12 * 3600 * 1000)), weightKg: e.weightKg! }));
  return pts.map((p, i) => {
    const window = pts.slice(Math.max(0, i - 6), i + 1);
    const avg7 = window.length >= 3 ? Math.round((window.reduce((a, w) => a + w.weightKg, 0) / window.length) * 10) / 10 : null;
    return { ...p, avg7 };
  });
}

export async function getLatestWeight(userId: string): Promise<{ weightKg: number; date: Date } | null> {
  const e = await db.progressEntry.findFirst({ where: { userId, weightKg: { not: null } }, orderBy: { date: "desc" }, select: { weightKg: true, date: true } });
  return e ? { weightKg: e.weightKg!, date: e.date } : null;
}

/** Workouts grouped by ISO-ish week (Mon–Sun) for the last N weeks: sessions, minutes, volume. */
export async function getWeeklyWorkoutSeries(userId: string, todayKey: string, weeks: number) {
  const days = weeks * 7;
  const firstKey = shiftDayKey(todayKey, -(days - 1));
  const { start } = dayRange(firstKey);
  const { end } = dayRange(todayKey);
  const logs = await db.workoutLog.findMany({
    where: { userId, performedAt: { gte: start, lt: end } },
    select: { performedAt: true, durationMin: true, caloriesBurned: true, sets: { select: { reps: true, weightKg: true, completed: true } } },
  });
  // Bucket by 7-day windows ending today.
  const buckets = Array.from({ length: weeks }, (_, i) => {
    const endKey = shiftDayKey(todayKey, -(weeks - 1 - i) * 7);
    const startKey = shiftDayKey(endKey, -6);
    return { label: `${startKey.slice(5)}→${endKey.slice(5)}`, startKey, endKey, sessions: 0, minutes: 0, volume: 0, calories: 0 };
  });
  for (const l of logs) {
    for (const b of buckets) {
      const r0 = dayRange(b.startKey).start;
      const r1 = dayRange(b.endKey).end;
      if (l.performedAt >= r0 && l.performedAt < r1) {
        b.sessions += 1;
        b.minutes += l.durationMin;
        b.calories += l.caloriesBurned ?? 0;
        b.volume += l.sets.reduce((a, s) => (s.completed && s.reps && s.weightKg ? a + s.reps * s.weightKg : a), 0);
        break;
      }
    }
  }
  return buckets.map((b) => ({ ...b, volume: Math.round(b.volume) }));
}

/** Consecutive-day streak of "active days" (a workout or meal logged), ending today or yesterday. */
export async function getStreak(userId: string, todayKey: string) {
  const lookback = 120;
  const firstKey = shiftDayKey(todayKey, -lookback);
  const { start } = dayRange(firstKey);
  const [meals, workouts] = await Promise.all([
    db.mealLog.findMany({ where: { userId, eatenAt: { gte: start } }, select: { eatenAt: true } }),
    db.workoutLog.findMany({ where: { userId, performedAt: { gte: start } }, select: { performedAt: true } }),
  ]);
  const active = new Set<string>();
  for (const m of meals) active.add(toDayKey(m.eatenAt));
  for (const w of workouts) active.add(toDayKey(w.performedAt));

  let streak = 0;
  let cursor = active.has(todayKey) ? todayKey : shiftDayKey(todayKey, -1);
  while (active.has(cursor) && streak < lookback) {
    streak += 1;
    cursor = shiftDayKey(cursor, -1);
  }
  const activeDays30 = Array.from({ length: 30 }, (_, i) => shiftDayKey(todayKey, -i)).filter((k) => active.has(k)).length;
  return { streak, activeToday: active.has(todayKey), activeDays30 };
}
