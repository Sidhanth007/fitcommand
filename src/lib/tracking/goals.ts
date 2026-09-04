import "server-only";
import { db } from "@/lib/db";
import { dayRange, shiftDayKey, toDayKey } from "@/lib/dates";
import type { Goal } from "@/generated/prisma/client";
import type { GoalType } from "@/generated/prisma/enums";

export const GOAL_TYPE_META: Record<GoalType, { label: string; unit: string; hint: string; daily: boolean }> = {
  TARGET_WEIGHT: { label: "Reach a target weight", unit: "kg", hint: "Tracked from your weigh-ins", daily: false },
  WORKOUTS_PER_WEEK: { label: "Workouts per week", unit: "sessions", hint: "Counted from logged workouts this week", daily: false },
  DAILY_CALORIES: { label: "Stay within daily calories", unit: "kcal", hint: "A day counts when you finish at or under the target", daily: true },
  DAILY_PROTEIN: { label: "Hit daily protein", unit: "g", hint: "A day counts when you reach the target", daily: true },
  DAILY_WATER_ML: { label: "Drink enough water", unit: "ml", hint: "A day counts when you reach the target", daily: true },
  DAILY_STEPS: { label: "Daily steps", unit: "steps", hint: "From your daily check-in", daily: true },
  CUSTOM: { label: "Custom goal", unit: "", hint: "Update progress manually", daily: false },
};

export type GoalProgress = {
  goal: Goal;
  current: number;
  percent: number; // 0-100
  detail: string;
  hitDays7?: number;
  reached: boolean;
};

function clampPct(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export async function getGoalsWithProgress(userId: string, todayKey: string): Promise<GoalProgress[]> {
  const goals = await db.goal.findMany({ where: { userId }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] });
  if (goals.length === 0) return [];

  const weekStart = shiftDayKey(todayKey, -6);
  const { start: weekStartAt } = dayRange(weekStart);
  const { end: todayEnd } = dayRange(todayKey);

  const [profile, latestWeight, workoutsThisWeek, meals7, entries7] = await Promise.all([
    db.profile.findUnique({ where: { userId }, select: { weightKg: true } }),
    db.progressEntry.findFirst({ where: { userId, weightKg: { not: null } }, orderBy: { date: "desc" }, select: { weightKg: true } }),
    db.workoutLog.count({ where: { userId, performedAt: { gte: weekStartAt, lt: todayEnd } } }),
    db.mealLog.findMany({ where: { userId, eatenAt: { gte: weekStartAt, lt: todayEnd } }, select: { eatenAt: true, calories: true, proteinG: true } }),
    db.progressEntry.findMany({ where: { userId, date: { gte: weekStartAt, lt: todayEnd } }, select: { date: true, waterMl: true, steps: true } }),
  ]);

  const keys7 = Array.from({ length: 7 }, (_, i) => shiftDayKey(todayKey, -i));
  const perDay = new Map(keys7.map((k) => [k, { calories: 0, proteinG: 0, waterMl: 0, steps: 0, hasMeals: false }]));
  for (const m of meals7) {
    const k = toDayKey(m.eatenAt);
    const d = perDay.get(k);
    if (d) {
      d.calories += m.calories;
      d.proteinG += m.proteinG;
      d.hasMeals = true;
    }
  }
  for (const e of entries7) {
    const k = toDayKey(new Date(e.date.getTime() + 12 * 3600 * 1000));
    const d = perDay.get(k);
    if (d) {
      d.waterMl = e.waterMl ?? 0;
      d.steps = e.steps ?? 0;
    }
  }
  const today = perDay.get(todayKey)!;
  const currentWeight = latestWeight?.weightKg ?? profile?.weightKg ?? 0;

  const results: GoalProgress[] = [];
  for (const goal of goals) {
    const t = goal.targetValue;
    let current = goal.currentValue;
    let percent = 0;
    let detail = "";
    let hitDays7: number | undefined;
    let reached = false;

    switch (goal.type) {
      case "TARGET_WEIGHT": {
        current = currentWeight;
        const startWeight = goal.currentValue || currentWeight; // start weight captured at creation
        const total = Math.abs(startWeight - t);
        const done = total > 0 ? Math.abs(startWeight - current) : 0;
        const overshoot = (startWeight >= t && current <= t) || (startWeight < t && current >= t);
        percent = total > 0 ? clampPct((done / total) * 100) : 100;
        reached = overshoot || Math.abs(current - t) < 0.05;
        if (reached) percent = 100;
        detail = `${current.toFixed(1)} kg now · target ${t} kg · ${Math.abs(current - t).toFixed(1)} kg to go`;
        break;
      }
      case "WORKOUTS_PER_WEEK": {
        current = workoutsThisWeek;
        percent = clampPct((current / t) * 100);
        reached = current >= t;
        detail = `${current} of ${t} sessions in the last 7 days`;
        break;
      }
      case "DAILY_CALORIES": {
        current = Math.round(today.calories);
        hitDays7 = keys7.filter((k) => perDay.get(k)!.hasMeals && perDay.get(k)!.calories <= t).length;
        percent = clampPct((current / t) * 100);
        reached = today.hasMeals && current <= t;
        detail = `${current} of ${t} kcal today · ${hitDays7}/7 days within target`;
        break;
      }
      case "DAILY_PROTEIN": {
        current = Math.round(today.proteinG);
        hitDays7 = keys7.filter((k) => perDay.get(k)!.proteinG >= t).length;
        percent = clampPct((current / t) * 100);
        reached = current >= t;
        detail = `${current} of ${t} g today · ${hitDays7}/7 days hit`;
        break;
      }
      case "DAILY_WATER_ML": {
        current = today.waterMl;
        hitDays7 = keys7.filter((k) => perDay.get(k)!.waterMl >= t).length;
        percent = clampPct((current / t) * 100);
        reached = current >= t;
        detail = `${current} of ${t} ml today · ${hitDays7}/7 days hit`;
        break;
      }
      case "DAILY_STEPS": {
        current = today.steps;
        hitDays7 = keys7.filter((k) => perDay.get(k)!.steps >= t).length;
        percent = clampPct((current / t) * 100);
        reached = current >= t;
        detail = `${current.toLocaleString()} of ${t.toLocaleString()} steps today · ${hitDays7}/7 days hit`;
        break;
      }
      default: {
        percent = clampPct((current / t) * 100);
        reached = current >= t;
        detail = `${current} of ${t} ${goal.unit}`;
      }
    }
    results.push({ goal, current, percent, detail, hitDays7, reached });
  }
  return results;
}

/** Mark non-daily goals complete automatically when reached. */
export async function autoCompleteGoals(progress: GoalProgress[]) {
  const toComplete = progress.filter((p) => p.goal.status === "ACTIVE" && p.reached && !GOAL_TYPE_META[p.goal.type].daily && p.goal.type !== "WORKOUTS_PER_WEEK");
  if (toComplete.length === 0) return;
  await db.goal.updateMany({ where: { id: { in: toComplete.map((p) => p.goal.id) } }, data: { status: "COMPLETED", completedAt: new Date() } });
  for (const p of toComplete) {
    p.goal.status = "COMPLETED";
  }
}
