import type { Metadata } from "next";
import Link from "next/link";
import { Activity, CalendarDays, CheckCircle2, Droplets, Flame, Play, Scale, Sparkles, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { StatTile } from "@/components/dashboard/stat-tile";
import { MacroMeters } from "@/components/nutrition/macro-meters";
import { WorkoutCard } from "@/components/plan/workout-card";
import { RegenerateButton } from "@/components/plan/regenerate-button";
import { requireOnboarded } from "@/lib/auth/onboarding";
import { getActivePlan } from "@/lib/engine/plan-service";
import { calcBmi, bmiCategory } from "@/lib/engine/nutrition";
import { DAY_SHORT, GOAL_OPTIONS, labelOf } from "@/lib/engine/options";
import { getDayNutrition } from "@/lib/tracking/nutrition";
import { getWeeklyWorkoutStats, getWorkoutsOnDay } from "@/lib/tracking/workouts";
import { getProgressEntries, getStreak, weightSeries } from "@/lib/tracking/progress";
import { getGoalsWithProgress } from "@/lib/tracking/goals";
import { getReminders, REMINDER_META, remindersForToday } from "@/lib/tracking/reminders";
import { WeightSparkline } from "@/components/dashboard/weight-sparkline";
import { getConsistency, SKIP_REASONS } from "@/lib/tracking/consistency";
import { QuickActions } from "@/components/app/quick-actions";
import { GettingStarted, type ChecklistItem } from "@/components/dashboard/getting-started";
import { ProductTour } from "@/components/tour/product-tour";
import { db } from "@/lib/db";
import { SkipDialog } from "@/components/workouts/skip-dialog";
import { ChangedMindButton } from "@/components/workouts/changed-mind-button";
import { AlertTriangle } from "lucide-react";
import { Bell, Target as TargetIcon, Trophy } from "lucide-react";
import { toDayKey, weekdayOf } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const [{ user, profile, targets }, sp] = await Promise.all([requireOnboarded(), props.searchParams]);
  const todayKey = toDayKey();
  const today = weekdayOf(todayKey);
  const [plan, day, todaysLogs, week, streak, goals, reminders, recentEntries] = await Promise.all([
    getActivePlan(user.id),
    getDayNutrition(user.id, todayKey),
    getWorkoutsOnDay(user.id, todayKey),
    getWeeklyWorkoutStats(user.id, todayKey),
    getStreak(user.id, todayKey),
    getGoalsWithProgress(user.id, todayKey),
    getReminders(user.id),
    getProgressEntries(user.id, todayKey, 30),
  ]);
  const consistency = await getConsistency(user.id, todayKey, 28);
  const skippedToday = consistency.days.find((d) => d.dayKey === todayKey)?.status === "skipped";
  const [mealCount, workoutCount, weighIns, goalCount, chatCount, reminderCount] = await Promise.all([
    db.mealLog.count({ where: { userId: user.id } }),
    db.workoutLog.count({ where: { userId: user.id } }),
    db.progressEntry.count({ where: { userId: user.id, weightKg: { not: null } } }),
    db.goal.count({ where: { userId: user.id } }),
    db.chatMessage.count({ where: { userId: user.id, role: "USER" } }),
    db.reminder.count({ where: { userId: user.id } }),
  ]);
  const checklist: ChecklistItem[] = [
    { key: "meal", label: "Log your first meal", href: "/nutrition", done: mealCount > 0 },
    { key: "workout", label: "Complete a workout", href: "/workouts", done: workoutCount > 0 },
    { key: "weight", label: "Record a weigh-in", href: "/progress", done: weighIns > 0 },
    { key: "goal", label: "Set a goal", href: "/goals", done: goalCount > 0 },
    { key: "reminder", label: "Add a reminder or daily email", href: "/reminders", done: reminderCount > 0 },
    { key: "chat", label: "Ask the AI assistant something", href: "/assistant", done: chatCount > 0 },
  ];
  const tourAutoStart = !profile.tourDoneAt || sp.tour === "1";
  const activeGoals = goals.filter((g) => g.goal.status === "ACTIVE").slice(0, 3);
  const todaysReminders = remindersForToday(reminders, todayKey);
  const weights = weightSeries(recentEntries).map((w) => w.weightKg);

  const todaysWorkout = plan?.workouts.find((w) => w.dayOfWeek === today) ?? null;
  const doneToday = todaysWorkout ? todaysLogs.find((l) => l.planWorkoutId === todaysWorkout.id) : undefined;
  const nextWorkout =
    plan?.workouts.length && !todaysWorkout
      ? [...plan.workouts].sort((a, b) => ((a.dayOfWeek - today + 7) % 7) - ((b.dayOfWeek - today + 7) % 7))[0]
      : null;

  const bmi = calcBmi(profile.heightCm, profile.weightKg);
  const trainingDays = new Set(plan?.workouts.map((w) => w.dayOfWeek));
  const remaining = targets ? Math.round(targets.calories - day.totals.calories) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {sp.welcome === "1" ? "Your plan is ready, " : "Welcome back, "}
            {user.name.split(" ")[0]} 👋
          </h1>
          <p className="text-muted-foreground">
            Goal: <span className="font-medium text-foreground">{labelOf(GOAL_OPTIONS, profile.goal)}</span> · {week.sessions}/{profile.daysPerWeek} sessions this week ·{" "}
            <span className={cn(streak.streak > 0 && "font-medium text-foreground")}>🔥 {streak.streak}-day streak</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/settings/profile" />}>
            Edit profile
          </Button>
          <RegenerateButton />
        </div>
      </div>

      <DisclaimerBanner />

      {consistency.currentMissStreak >= 2 && (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <span className="font-medium">{consistency.currentMissStreak} planned sessions missed in a row.</span> Restart light — a short session today beats a perfect one next week.
            </span>
          </span>
          <Link href="/workouts" className="shrink-0 font-medium underline-offset-4 hover:underline">
            See consistency summary →
          </Link>
        </div>
      )}

      <ProductTour autoStart={tourAutoStart} />

      <div id="tour-tiles" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Calories remaining" value={remaining != null ? remaining.toLocaleString() : "—"} unit="kcal" hint={targets ? `${Math.round(day.totals.calories)} of ${targets.calories.toLocaleString()} eaten` : undefined} icon={Flame} />
        <StatTile label="Protein today" value={String(Math.round(day.totals.proteinG))} unit={targets ? `/ ${targets.proteinG} g` : "g"} hint={targets ? `${Math.round((day.totals.proteinG / targets.proteinG) * 100)}% of target` : undefined} icon={Target} />
        <StatTile label="Water today" value={(day.waterMl / 1000).toFixed(2)} unit={targets ? `/ ${(targets.waterMl / 1000).toFixed(1)} L` : "L"} icon={Droplets} />
        <StatTile label="Body mass index" value={bmi.toFixed(1)} hint={bmiCategory(bmi)} icon={Scale} />
      </div>

      <QuickActions dayKey={todayKey} waterMl={day.waterMl} targetMl={targets?.waterMl ?? 2500} workoutHref={todaysWorkout && !doneToday ? `/workouts/start?workout=${todaysWorkout.id}` : null} />

      <GettingStarted items={checklist} />

      <div className="grid gap-6 lg:grid-cols-5">
        <div id="tour-today" className="space-y-4 lg:col-span-3">
          {todaysWorkout ? (
            <>
              <WorkoutCard workout={todaysWorkout} highlight />
              {doneToday ? (
                <div className="flex items-center justify-between rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="size-4 text-primary" /> Completed today · {doneToday.durationMin} min · {doneToday.caloriesBurned ?? 0} kcal
                  </span>
                  <Link href={`/workouts/${doneToday.id}`} className="underline-offset-4 hover:underline">
                    View log
                  </Link>
                </div>
              ) : skippedToday ? (
                <div className="flex flex-col gap-3 rounded-xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-muted-foreground">
                    Marked as missed today — <Link href="/workouts" className="underline-offset-4 hover:underline">see your consistency summary</Link>.
                  </span>
                  <ChangedMindButton dayKey={todayKey} planWorkoutId={todaysWorkout.id} size="sm" />
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button size="lg" className="flex-1" nativeButton={false} render={<Link href={`/workouts/start?workout=${todaysWorkout.id}`} />}>
                    <Play className="size-4" /> Start today&apos;s session
                  </Button>
                  <SkipDialog reasons={SKIP_REASONS} days={[{ dayKey: todayKey, label: "Today", title: todaysWorkout.title, planWorkoutId: todaysWorkout.id }]} triggerLabel="Missed it" size="lg" variant="outline" />
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardDescription>{DAY_SHORT[today]} · Rest day</CardDescription>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="size-4 text-primary" /> Recovery day
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>
                  No session scheduled today.
                  {nextWorkout && (
                    <>
                      {" "}
                      Next up: <span className="font-medium text-foreground">{nextWorkout.title}</span> on {DAY_SHORT[nextWorkout.dayOfWeek]}.
                    </>
                  )}
                </span>
                <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/workouts/new" />}>
                  Log a custom workout
                </Button>
              </CardContent>
            </Card>
          )}
          <Button variant="ghost" className="w-full" nativeButton={false} render={<Link href="/plan" />}>
            View full weekly plan →
          </Button>
        </div>

        <div className="space-y-4 lg:col-span-2">
          {targets && (
            <Card id="tour-nutrition">
              <CardHeader>
                <CardDescription>Today&apos;s nutrition</CardDescription>
                <CardTitle className="text-base">Consumed vs target</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <MacroMeters consumed={day.totals} target={targets} compact />
                <Button variant="outline" size="sm" className="w-full" nativeButton={false} render={<Link href="/nutrition" />}>
                  Log a meal
                </Button>
              </CardContent>
            </Card>
          )}

          <Card id="tour-week">
            <CardHeader>
              <CardDescription>This week</CardDescription>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="size-4 text-primary" /> {plan?.title ?? "No plan yet"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid grid-cols-7 gap-1.5" aria-label="Weekly schedule">
                {DAY_SHORT.map((d, i) => {
                  const active = trainingDays.has(i);
                  return (
                    <li key={d} className={cn("flex flex-col items-center rounded-lg border py-2 text-xs", active ? "border-primary/40 bg-primary/10 font-medium" : "text-muted-foreground", i === today && "ring-2 ring-primary/40")}>
                      <span>{d}</span>
                      <span className={cn("mt-1 size-1.5 rounded-full", active ? "bg-primary" : "bg-transparent")} aria-hidden />
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardDescription>Today&apos;s reminders</CardDescription>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bell className="size-4 text-primary" /> {todaysReminders.filter((r) => r.status === "due").length} due · {todaysReminders.filter((r) => r.status === "upcoming").length} upcoming
                </CardTitle>
              </div>
              <Link href="/reminders" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
                Manage
              </Link>
            </CardHeader>
            <CardContent>
              {todaysReminders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reminders today. Add a workout or water nudge on the Reminders page.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {todaysReminders.slice(0, 5).map((r) => (
                    <li key={r.id} className={cn("flex items-center justify-between rounded-lg border px-3 py-1.5", r.status === "due" && "border-primary/40 bg-primary/5")}>
                      <span className="flex items-center gap-2">
                        <span aria-hidden>{REMINDER_META[r.type].emoji}</span> {r.title}
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground">{r.timeOfDay}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardDescription>Goals</CardDescription>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TargetIcon className="size-4 text-primary" /> {activeGoals.length ? `${activeGoals.length} active` : "No active goals"}
                </CardTitle>
              </div>
              <Link href="/goals" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
                {activeGoals.length ? "View all" : "Add one"}
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeGoals.map((g) => (
                <div key={g.goal.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 truncate">
                      {g.reached && <Trophy className="size-3.5 text-primary" />} {g.goal.title}
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">{g.percent}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full", g.reached ? "bg-primary" : "bg-chart-2")} style={{ width: `${g.percent}%` }} />
                  </div>
                </div>
              ))}
              {weights.length >= 2 && (
                <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div className="text-xs text-muted-foreground">
                    Weight, last 30 days
                    <div className="text-sm font-medium text-foreground tabular-nums">
                      {weights.at(-1)!.toFixed(1)} kg <span className="text-xs font-normal text-muted-foreground">({weights.at(-1)! - weights[0]! >= 0 ? "+" : ""}{(weights.at(-1)! - weights[0]!).toFixed(1)})</span>
                    </div>
                  </div>
                  <WeightSparkline values={weights} />
                </div>
              )}
              {activeGoals.length === 0 && weights.length < 2 && <p className="text-sm text-muted-foreground">Log a weigh-in on the Progress page and set a goal to see them here.</p>}
            </CardContent>
          </Card>

          <Card id="tour-assistant" className="border-primary/30 bg-primary/5">
            <CardContent className="flex items-start gap-3 pt-6 text-sm">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="space-y-2">
                <div>
                  <Badge variant="secondary" className="mb-1">
                    AI assistant
                  </Badge>
                  <p className="text-muted-foreground">Ask about today&apos;s meals, swap a workout, or get your targets explained — it knows your data.</p>
                </div>
                <Button size="sm" nativeButton={false} render={<Link href="/assistant" />}>
                  Open assistant
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
