import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Dumbbell, Flame, History, Play, Plus, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/dashboard/stat-tile";
import { requireOnboarded } from "@/lib/auth/onboarding";
import { getActivePlan } from "@/lib/engine/plan-service";
import { getWeeklyWorkoutStats, getWorkoutHistory, getWorkoutsOnDay, workoutVolume } from "@/lib/tracking/workouts";
import { formatDateTime, formatDayKey, toDayKey, weekdayOf } from "@/lib/dates";
import { DAY_NAMES, MUSCLE_LABELS } from "@/lib/engine/options";
import { getConsistency, SKIP_REASONS } from "@/lib/tracking/consistency";
import { SkipDialog } from "@/components/workouts/skip-dialog";
import { ChangedMindButton } from "@/components/workouts/changed-mind-button";
import { ConsistencyCard } from "@/components/workouts/consistency-card";

export const metadata: Metadata = { title: "Workouts" };

export default async function WorkoutsPage() {
  const { user } = await requireOnboarded();
  const todayKey = toDayKey();
  const [plan, history, todays, week, consistency] = await Promise.all([getActivePlan(user.id), getWorkoutHistory(user.id), getWorkoutsOnDay(user.id, todayKey), getWeeklyWorkoutStats(user.id, todayKey), getConsistency(user.id, todayKey, 28)]);
  const planned = plan?.workouts.find((w) => w.dayOfWeek === weekdayOf(todayKey)) ?? null;
  const doneToday = planned ? todays.find((t) => t.planWorkoutId === planned.id) : undefined;
  const todayEntry = consistency.days.find((d) => d.dayKey === todayKey);
  const skippedToday = todayEntry?.status === "skipped";
  const skippableDays = [
    ...(planned && !doneToday && !skippedToday && todays.length === 0 ? [{ dayKey: todayKey, label: "Today", title: planned.title, planWorkoutId: planned.id }] : []),
    ...consistency.missablePastDays.map((d) => ({ dayKey: d.dayKey, label: formatDayKey(d.dayKey, { weekday: "short", day: "numeric", month: "short" }), title: d.title, planWorkoutId: d.planWorkoutId })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workouts</h1>
          <p className="text-muted-foreground">Log sessions from your plan or build your own.</p>
        </div>
        <Button variant="outline" nativeButton={false} render={<Link href="/workouts/new" />}>
          <Plus className="size-4" /> Log custom workout
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Sessions (7 days)" value={String(week.sessions)} icon={Dumbbell} />
        <StatTile label="Minutes (7 days)" value={String(week.minutes)} icon={Timer} />
        <StatTile label="Calories burned (7 days)" value={week.calories.toLocaleString()} unit="kcal" icon={Flame} />
      </div>

      <Card className={planned && !doneToday ? "border-primary/50 ring-2 ring-primary/20" : undefined}>
        <CardHeader>
          <CardDescription>Today · {DAY_NAMES[weekdayOf(todayKey)]}</CardDescription>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="size-4 text-primary" /> {planned ? planned.title : "Rest day"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {planned ? `${MUSCLE_LABELS[planned.focus]} · ${planned.exercises.length} exercises · ~${planned.estMinutes} min` : "Nothing scheduled — log a custom session if you train anyway."}
          </div>
          {planned &&
            (doneToday ? (
              <Badge className="gap-1.5">
                <CheckCircle2 className="size-3.5" /> Completed · {doneToday.durationMin} min · {doneToday.caloriesBurned ?? 0} kcal
              </Badge>
            ) : skippedToday ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="gap-1.5">
                  Marked as missed{todayEntry?.reason ? ` · ${todayEntry.reason.toLowerCase().replace("_", " ")}` : ""}
                </Badge>
                <ChangedMindButton dayKey={todayKey} planWorkoutId={planned.id} size="sm" />
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <SkipDialog reasons={SKIP_REASONS} days={skippableDays.filter((d) => d.dayKey === todayKey)} />
                <Button nativeButton={false} render={<Link href={`/workouts/start?workout=${planned.id}`} />}>
                  <Play className="size-4" /> Start session
                </Button>
              </div>
            ))}
        </CardContent>
      </Card>

      <ConsistencyCard c={consistency} todayKey={todayKey} />
      {consistency.missablePastDays.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
          <span>
            {consistency.missablePastDays.length} planned day{consistency.missablePastDays.length === 1 ? "" : "s"} with no workout logged. Trained but forgot to log it? Backfill it. Actually missed? Record why.
          </span>
          <span className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/workouts/start?workout=${consistency.missablePastDays[0]!.planWorkoutId}&date=${consistency.missablePastDays[0]!.dayKey}`} />}>
              Backfill a workout
            </Button>
            <SkipDialog reasons={SKIP_REASONS} days={skippableDays.filter((d) => d.dayKey !== todayKey)} triggerLabel="Log a missed day" size="sm" variant="secondary" />
          </span>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <History className="size-4 text-primary" /> History
        </h2>
        {history.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">No workouts logged yet. Start today&apos;s session to see it here.</CardContent>
          </Card>
        ) : (
          <ul className="divide-y rounded-xl border">
            {history.map((h) => {
              const done = h.sets.filter((s) => s.completed).length;
              const volume = workoutVolume(h.sets);
              return (
                <li key={h.id}>
                  <Link href={`/workouts/${h.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{h.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateTime(h.performedAt)} · {h.durationMin} min · {done} sets{volume ? ` · ${volume.toLocaleString()} kg volume` : ""}
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-sm">
                      <div className="font-medium tabular-nums">{h.caloriesBurned ?? 0} kcal</div>
                      {h.rating && <div className="text-xs text-muted-foreground">effort {h.rating}/5</div>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
