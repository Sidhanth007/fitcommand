import type { Metadata } from "next";
import { Target, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { StatTile } from "@/components/dashboard/stat-tile";
import { GoalForm } from "@/components/goals/goal-form";
import { GoalCard, type GoalView } from "@/components/goals/goal-card";
import { requireOnboarded } from "@/lib/auth/onboarding";
import { autoCompleteGoals, getGoalsWithProgress, GOAL_TYPE_META } from "@/lib/tracking/goals";
import { getStreak } from "@/lib/tracking/progress";
import { toDayKey } from "@/lib/dates";
import { GOAL_TYPES } from "@/lib/validators/progress";

export const metadata: Metadata = { title: "Goals" };

export default async function GoalsPage() {
  const { user, profile, targets } = await requireOnboarded();
  const todayKey = toDayKey();
  const [progress, streak] = await Promise.all([getGoalsWithProgress(user.id, todayKey), getStreak(user.id, todayKey)]);
  await autoCompleteGoals(progress);

  const suggested: Record<string, number> = {
    TARGET_WEIGHT: profile.targetWeightKg ?? Math.round(profile.weightKg),
    WORKOUTS_PER_WEEK: profile.daysPerWeek,
    DAILY_CALORIES: targets?.calories ?? 2000,
    DAILY_PROTEIN: targets?.proteinG ?? 120,
    DAILY_WATER_ML: targets?.waterMl ?? 2500,
    DAILY_STEPS: 8000,
    CUSTOM: 0,
  };
  const types = GOAL_TYPES.map((t) => ({ value: t, label: GOAL_TYPE_META[t].label, unit: GOAL_TYPE_META[t].unit, hint: GOAL_TYPE_META[t].hint, suggested: suggested[t] ?? 0 }));

  const views: GoalView[] = progress.map((p) => ({
    id: p.goal.id,
    type: p.goal.type,
    title: p.goal.title,
    status: p.goal.status,
    targetValue: p.goal.targetValue,
    currentValue: p.goal.currentValue,
    unit: p.goal.unit,
    deadline: p.goal.deadline ? p.goal.deadline.toISOString() : null,
    percent: p.percent,
    detail: p.detail,
    reached: p.reached,
    daily: GOAL_TYPE_META[p.goal.type].daily,
  }));
  const active = views.filter((v) => v.status === "ACTIVE");
  const others = views.filter((v) => v.status !== "ACTIVE");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Goals</h1>
          <p className="text-muted-foreground">Set targets; most update automatically from what you log.</p>
        </div>
        <GoalForm types={types} />
      </div>

      <DisclaimerBanner />

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Active goals" value={String(active.length)} icon={Target} />
        <StatTile label="Completed" value={String(views.filter((v) => v.status === "COMPLETED").length)} icon={Trophy} />
        <StatTile label="Active-day streak" value={String(streak.streak)} unit={streak.streak === 1 ? "day" : "days"} icon={Target} />
      </div>

      {views.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No goals yet. Try <span className="font-medium text-foreground">Workouts per week</span> or <span className="font-medium text-foreground">Hit daily protein</span> — they track themselves.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {active.map((g) => (
              <GoalCard key={g.id} g={g} />
            ))}
          </div>
          {others.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">Completed &amp; archived</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {others.map((g) => (
                  <GoalCard key={g.id} g={g} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
