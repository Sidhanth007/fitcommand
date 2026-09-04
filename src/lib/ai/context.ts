import "server-only";
import { db } from "@/lib/db";
import { APP_NAME } from "@/lib/constants";
import { toDayKey, weekdayOf } from "@/lib/dates";
import { ACTIVITY_OPTIONS, DIET_OPTIONS, EQUIPMENT_LABELS, EXPERIENCE_OPTIONS, GOAL_OPTIONS, labelOf } from "@/lib/engine/options";
import { getActivePlan } from "@/lib/engine/plan-service";
import { getDayNutrition } from "@/lib/tracking/nutrition";
import { getWorkoutHistory, getWorkoutsOnDay } from "@/lib/tracking/workouts";
import { getStreak } from "@/lib/tracking/progress";
import { getGoalsWithProgress } from "@/lib/tracking/goals";
import { getConsistency } from "@/lib/tracking/consistency";

export const ASSISTANT_RULES = `You are the ${APP_NAME} assistant — a friendly, evidence-based fitness and nutrition coach inside a demo web app.

Hard rules:
- You are an AI tool, not a doctor or registered dietitian. Never diagnose, never prescribe medication or supplements doses, never give advice for eating disorders, pregnancy, diabetes/insulin, heart conditions, kidney disease or other medical conditions — instead recommend a qualified professional. If someone mentions chest pain, fainting, severe pain, self-harm or extreme fasting, respond with care and urge them to seek professional/emergency help immediately.
- Keep answers practical and concise: short paragraphs or bullet points, no long lectures. Use the user's own data (below) whenever relevant and say when you are using it.
- Be honest about food quality without shaming: point out treats/low-nutrition choices and offer realistic swaps, ideally from Indian home cooking (dal, sabzi, roti, curd, sprouts, chana, paneer, eggs, fruit).
- Prefer gradual, sustainable changes. Never recommend under 1,200 kcal/day (women) or 1,500 kcal/day (men), extreme deficits, or rapid weight loss.
- Units: kg, cm, kcal, g. Currency-free. Indian context is fine (katori, roti, chai).
- If asked about something outside fitness/nutrition/wellbeing, answer briefly or politely redirect.
- End every substantive answer with one short line reminding that this is AI guidance, not medical advice (vary the wording).`;

export async function buildUserContext(userId: string): Promise<string> {
  const todayKey = toDayKey();
  const [user, profile, targets, plan, day, todaysWorkouts, history, streak, goals, consistency] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { name: true } }),
    db.profile.findUnique({ where: { userId } }),
    db.nutritionTarget.findUnique({ where: { userId } }),
    getActivePlan(userId),
    getDayNutrition(userId, todayKey),
    getWorkoutsOnDay(userId, todayKey),
    getWorkoutHistory(userId, 5),
    getStreak(userId, todayKey),
    getGoalsWithProgress(userId, todayKey),
    getConsistency(userId, todayKey, 28),
  ]);
  if (!user || !profile) return `User: ${user?.name ?? "unknown"} (profile not completed yet).`;

  const todaysPlanned = plan?.workouts.find((w) => w.dayOfWeek === weekdayOf(todayKey));
  const lines: string[] = [
    `Name: ${user.name}. Today: ${todayKey}.`,
    `Profile: ${profile.age} y, ${profile.sex.toLowerCase()}, ${profile.heightCm} cm, ${profile.weightKg} kg${profile.targetWeightKg ? ` (target ${profile.targetWeightKg} kg)` : ""}. Goal: ${labelOf(GOAL_OPTIONS, profile.goal)}. Activity: ${labelOf(ACTIVITY_OPTIONS, profile.activityLevel)}. Experience: ${labelOf(EXPERIENCE_OPTIONS, profile.experience)}.`,
    `Training: ${profile.daysPerWeek} days/week, ~${profile.sessionMinutes} min, equipment: ${profile.equipment.map((e) => EQUIPMENT_LABELS[e]).join(", ") || "bodyweight"}.${profile.injuries ? ` Injuries/limits: ${profile.injuries}.` : ""}`,
    `Diet: ${labelOf(DIET_OPTIONS, profile.dietaryPreference)}${profile.allergies.length ? `; allergies: ${profile.allergies.join(", ")}` : ""}${profile.dislikedFoods.length ? `; dislikes: ${profile.dislikedFoods.join(", ")}` : ""}.`,
  ];
  if (targets) {
    lines.push(`Daily targets: ${targets.calories} kcal, protein ${targets.proteinG} g, carbs ${targets.carbsG} g, fat ${targets.fatG} g, water ${targets.waterMl} ml (BMR ${targets.bmr}, TDEE ${targets.tdee}).`);
    lines.push(`Eaten today so far: ${Math.round(day.totals.calories)} kcal, protein ${Math.round(day.totals.proteinG)} g, carbs ${Math.round(day.totals.carbsG)} g, fat ${Math.round(day.totals.fatG)} g; water ${day.waterMl} ml.${day.meals.length ? ` Items: ${day.meals.map((m) => `${m.name}${m.servings !== 1 ? ` ×${m.servings}` : ""} (${m.mealType.toLowerCase()}${m.healthScore != null ? `, health ${m.healthScore}/5` : ""})`).join("; ")}.` : " Nothing logged yet."}`);
  }
  if (plan) {
    lines.push(`Active plan: "${plan.title}" (week ${plan.weekNumber}). Today: ${todaysPlanned ? `${todaysPlanned.title} — ${todaysPlanned.exercises.map((e) => `${e.exercise.name} ${e.sets}×${e.reps}`).join(", ")}` : "rest day"}. ${todaysWorkouts.length ? `Already logged today: ${todaysWorkouts.map((w) => `${w.title} (${w.durationMin} min)`).join(", ")}.` : "No workout logged yet today."}`);
  }
  if (history.length) {
    lines.push(`Recent workouts: ${history.map((h) => `${h.title} on ${h.performedAt.toISOString().slice(0, 10)} (${h.durationMin} min, ${h.sets.filter((s) => s.completed).length} sets${h.rating ? `, effort ${h.rating}/5` : ""})`).join("; ")}.`);
  }
  lines.push(`Streak: ${streak.streak} active day${streak.streak === 1 ? "" : "s"}; ${streak.activeDays30} active days in the last 30.`);
  lines.push(consistency.summaryText + (consistency.days.filter((d) => d.status === "skipped").length ? ` Recent marked misses: ${consistency.days.filter((d) => d.status === "skipped").slice(-5).map((d) => `${d.dayKey} (${d.reason?.toLowerCase().replace("_", " ")}${d.note ? `: ${d.note}` : ""})`).join("; ")}.` : ""));
  const active = goals.filter((g) => g.goal.status === "ACTIVE");
  if (active.length) lines.push(`Goals: ${active.map((g) => `${g.goal.title} — ${g.percent}% (${g.detail})`).join("; ")}.`);

  return lines.join("\n");
}

export async function buildSystemPrompt(userId: string) {
  const context = await buildUserContext(userId);
  return `${ASSISTANT_RULES}\n\n=== USER DATA (from the app, trust it over assumptions) ===\n${context}\n=== END USER DATA ===`;
}
