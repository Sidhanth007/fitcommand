import "server-only";
import { db } from "@/lib/db";
import { dayRange, shiftDayKey, toDayKey, weekdayOf } from "@/lib/dates";
import { DAY_NAMES } from "@/lib/engine/options";
import type { SkipReason } from "@/generated/prisma/enums";
import { buildFeedback, type Feedback } from "@/lib/tracking/consistency-rules";

export const SKIP_REASONS: { value: SkipReason; label: string; emoji: string }[] = [
  { value: "TIRED", label: "Too tired", emoji: "😴" },
  { value: "BUSY", label: "Too busy / work", emoji: "💼" },
  { value: "SICK", label: "Unwell", emoji: "🤒" },
  { value: "TRAVEL", label: "Travelling", emoji: "✈️" },
  { value: "NO_MOTIVATION", label: "Didn't feel like it", emoji: "😕" },
  { value: "INJURY", label: "Injury / pain", emoji: "🩹" },
  { value: "OTHER", label: "Other", emoji: "📝" },
];

export function skipLabel(reason: SkipReason) {
  return SKIP_REASONS.find((r) => r.value === reason)?.label ?? reason;
}

export type PlannedDay = {
  dayKey: string;
  weekday: number;
  title: string;
  planWorkoutId: string;
  status: "done" | "missed" | "skipped" | "pending";
  reason?: SkipReason;
  note?: string | null;
};

export type { Feedback };

export type Consistency = {
  windowDays: number;
  planned: number;
  completed: number;
  missed: number; // explicit + implicit
  explicitSkips: number;
  adherencePct: number;
  currentMissStreak: number;
  daysSinceLastWorkout: number | null;
  longestGapDays: number | null;
  mostMissedWeekday: string | null;
  topReasons: { reason: SkipReason; label: string; count: number }[];
  days: PlannedDay[]; // planned days in window, oldest first
  missablePastDays: PlannedDay[]; // planned past days not done and not yet marked (for "log a missed day")
  feedback: Feedback[];
  summaryText: string; // plain text for AI prompts
};

export async function getConsistency(userId: string, todayKey = toDayKey(), windowDays = 28): Promise<Consistency> {
  const firstKey = shiftDayKey(todayKey, -(windowDays - 1));
  const { start } = dayRange(firstKey);
  const { end } = dayRange(todayKey);

  const [plan, firstPlan, logs, skips] = await Promise.all([
    db.fitnessPlan.findFirst({ where: { userId, isActive: true }, orderBy: { createdAt: "desc" }, include: { workouts: { select: { id: true, dayOfWeek: true, title: true } } } }),
    db.fitnessPlan.findFirst({ where: { userId }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    db.workoutLog.findMany({ where: { userId, performedAt: { gte: start, lt: end } }, select: { performedAt: true } }),
    db.workoutSkip.findMany({ where: { userId, date: { gte: start, lt: end } } }),
  ]);

  const doneDays = new Set(logs.map((l) => toDayKey(l.performedAt)));
  const skipByDay = new Map(skips.map((s) => [toDayKey(new Date(s.date.getTime() + 12 * 3600 * 1000)), s]));
  const byWeekday = new Map((plan?.workouts ?? []).map((w) => [w.dayOfWeek, w]));

  // Only days on or after the user's first plan count as "planned" — nothing before that can be a miss.
  const trackingStartKey = firstPlan ? toDayKey(firstPlan.createdAt) : todayKey;

  const days: PlannedDay[] = [];
  for (let i = 0; i < windowDays; i++) {
    const dayKey = shiftDayKey(firstKey, i);
    if (dayKey < trackingStartKey) continue;
    const weekday = weekdayOf(dayKey);
    const w = byWeekday.get(weekday);
    if (!w) continue;
    const skip = skipByDay.get(dayKey);
    let status: PlannedDay["status"];
    if (doneDays.has(dayKey)) status = "done";
    else if (skip) status = "skipped";
    else if (dayKey < todayKey) status = "missed";
    else status = "pending";
    days.push({ dayKey, weekday, title: w.title, planWorkoutId: w.id, status, reason: skip?.reason, note: skip?.note });
  }

  const planned = days.filter((d) => d.status !== "pending").length;
  const completed = days.filter((d) => d.status === "done").length;
  const explicitSkips = days.filter((d) => d.status === "skipped").length;
  const missed = days.filter((d) => d.status === "missed" || d.status === "skipped").length;
  const adherencePct = planned ? Math.round((completed / planned) * 100) : 0;

  // Current miss streak: consecutive planned days (latest first) that were missed/skipped, ignoring today if still pending.
  let currentMissStreak = 0;
  for (const d of [...days].reverse()) {
    if (d.status === "pending") continue;
    if (d.status === "done") break;
    currentMissStreak += 1;
  }

  const sortedDone = [...doneDays].sort();
  const lastDone = sortedDone.at(-1);
  const daysSinceLastWorkout = lastDone ? Math.round((new Date(`${todayKey}T12:00:00Z`).getTime() - new Date(`${lastDone}T12:00:00Z`).getTime()) / 86400000) : null;
  let longestGapDays: number | null = null;
  for (let i = 1; i < sortedDone.length; i++) {
    const gap = Math.round((new Date(`${sortedDone[i]}T12:00:00Z`).getTime() - new Date(`${sortedDone[i - 1]}T12:00:00Z`).getTime()) / 86400000);
    longestGapDays = Math.max(longestGapDays ?? 0, gap);
  }

  const missedByWeekday = new Map<number, number>();
  for (const d of days) if (d.status === "missed" || d.status === "skipped") missedByWeekday.set(d.weekday, (missedByWeekday.get(d.weekday) ?? 0) + 1);
  const topWeekday = [...missedByWeekday.entries()].sort((a, b) => b[1] - a[1])[0];
  const mostMissedWeekday = topWeekday && topWeekday[1] >= 2 ? DAY_NAMES[topWeekday[0]]! : null;

  const reasonCounts = new Map<SkipReason, number>();
  for (const s of skips) reasonCounts.set(s.reason, (reasonCounts.get(s.reason) ?? 0) + 1);
  const topReasons = [...reasonCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([reason, count]) => ({ reason, label: skipLabel(reason), count }));

  const missablePastDays = days.filter((d) => d.status === "missed").slice(-14).reverse();

  const feedback = buildFeedback({ planned, completed, adherencePct, currentMissStreak, daysSinceLastWorkout, mostMissedWeekday, topReasons, hasPlan: Boolean(plan) });

  const summaryText = plan
    ? `Consistency (since ${trackingStartKey > firstKey ? `plan start ${trackingStartKey}` : `${windowDays} days`}): ${completed} of ${planned} planned sessions completed (${adherencePct}%), ${missed} missed (${explicitSkips} marked with a reason). Current miss streak: ${currentMissStreak} planned session${currentMissStreak === 1 ? "" : "s"}. Days since last workout: ${daysSinceLastWorkout ?? "no workouts logged"}.${longestGapDays ? ` Longest gap: ${longestGapDays} days.` : ""}${mostMissedWeekday ? ` Most-missed day: ${mostMissedWeekday}.` : ""}${topReasons.length ? ` Top reasons: ${topReasons.map((r) => `${r.label} ×${r.count}`).join(", ")}.` : ""}`
    : "No active plan yet.";

  return { windowDays, planned, completed, missed, explicitSkips, adherencePct, currentMissStreak, daysSinceLastWorkout, longestGapDays, mostMissedWeekday, topReasons, days, missablePastDays, feedback, summaryText };
}
