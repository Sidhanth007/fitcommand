import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Flame, LineChart as LineChartIcon, Ruler, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { StatTile } from "@/components/dashboard/stat-tile";
import { CheckInForm } from "@/components/progress/check-in-form";
import { WeightChart } from "@/components/charts/weight-chart";
import { CaloriesChart } from "@/components/charts/calories-chart";
import { WorkoutsChart } from "@/components/charts/workouts-chart";
import { MEASUREMENT_META, MeasurementsChart, type MeasurementMetric } from "@/components/charts/measurements-chart";
import { requireOnboarded } from "@/lib/auth/onboarding";
import { getEntryForDay, getProgressEntries, getStreak, getWeeklyWorkoutSeries, weightSeries } from "@/lib/tracking/progress";
import { getCaloriesByDay } from "@/lib/tracking/nutrition";
import { formatDayKey, isValidDayKey, toDayKey } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Progress" };

const RANGES = [7, 30, 90] as const;

export default async function ProgressPage(props: PageProps<"/progress">) {
  const [{ user, profile, targets }, sp] = await Promise.all([requireOnboarded(), props.searchParams]);
  const todayKey = toDayKey();
  const range = RANGES.includes(Number(sp.range) as (typeof RANGES)[number]) ? (Number(sp.range) as (typeof RANGES)[number]) : 30;
  const metric = (typeof sp.metric === "string" && sp.metric in MEASUREMENT_META ? sp.metric : "waistCm") as MeasurementMetric;
  const intake = sp.intake === "protein" ? "protein" : "calories";
  const training = sp.training === "minutes" ? "minutes" : sp.training === "volume" ? "volume" : "sessions";
  const checkInKey = isValidDayKey(sp.date) ? sp.date : todayKey;

  const [entries, allWeights, calories, weekly, streak, entry] = await Promise.all([
    getProgressEntries(user.id, todayKey, range),
    getProgressEntries(user.id, todayKey, 365),
    getCaloriesByDay(user.id, todayKey, range),
    getWeeklyWorkoutSeries(user.id, todayKey, Math.max(4, Math.ceil(range / 7))),
    getStreak(user.id, todayKey),
    getEntryForDay(user.id, checkInKey),
  ]);

  const weights = weightSeries(entries);
  const latestWeight = weightSeries(allWeights).at(-1)?.weightKg ?? profile.weightKg;
  const firstWeight = weights[0]?.weightKg;
  const change = firstWeight != null ? latestWeight - firstWeight : null;
  const measurement = entries.filter((e) => e[metric] != null).map((e) => ({ dayKey: e.date.toISOString().slice(0, 10), value: Number(e[metric]) }));
  const qs = (patch: Record<string, string | number>) => {
    const p = new URLSearchParams({ range: String(range), metric, intake, training, ...(isValidDayKey(sp.date) ? { date: sp.date } : {}) });
    for (const [k, v] of Object.entries(patch)) p.set(k, String(v));
    return `/progress?${p.toString()}`;
  };
  const toggle = ({ options, current, param }: { options: { value: string; label: string }[]; current: string; param: string }) => (
    <div className="flex rounded-lg border p-0.5 text-xs">
      {options.map((o) => (
        <Link key={o.value} href={qs({ [param]: o.value })} className={cn("rounded-md px-2.5 py-1", current === o.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")} aria-current={current === o.value ? "true" : undefined}>
          {o.label}
        </Link>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Progress</h1>
          <p className="text-muted-foreground">Weigh-ins, measurements, intake and training over time.</p>
        </div>
        {toggle({ param: "range", current: String(range), options: RANGES.map((r) => ({ value: String(r), label: `${r} days` })) })}
      </div>

      <DisclaimerBanner />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Current weight" value={latestWeight.toFixed(1)} unit="kg" hint={change != null && weights.length > 1 ? `${change > 0 ? "+" : ""}${change.toFixed(1)} kg over ${range} days` : profile.targetWeightKg ? `Target ${profile.targetWeightKg} kg` : undefined} icon={Scale} />
        <StatTile label="Active-day streak" value={String(streak.streak)} unit={streak.streak === 1 ? "day" : "days"} hint={`${streak.activeDays30} active days in the last 30`} icon={Flame} />
        <StatTile label="Sessions" value={String(weekly.reduce((a, w) => a + w.sessions, 0))} hint={`last ${weekly.length} weeks`} icon={Activity} />
        <StatTile label="Check-ins" value={String(entries.filter((e) => e.weightKg != null || e.waistCm != null || e.steps != null).length)} hint={`in ${range} days`} icon={Ruler} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Scale className="size-4 text-primary" /> Weight trend
              </CardTitle>
              <CardDescription>Daily weigh-ins with a 7-day average{profile.targetWeightKg ? " and your target" : ""}.</CardDescription>
            </CardHeader>
            <CardContent>
              <WeightChart data={weights} targetKg={profile.targetWeightKg} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Flame className="size-4 text-primary" /> Daily intake
                </CardTitle>
                <CardDescription>Logged meals vs your target.</CardDescription>
              </div>
              {toggle({ param: "intake", current: intake, options: [{ value: "calories", label: "Calories" }, { value: "protein", label: "Protein" }] })}
            </CardHeader>
            <CardContent>
              <CaloriesChart data={calories} targetCalories={targets?.calories ?? 2000} targetProtein={targets?.proteinG ?? 120} metric={intake} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="size-4 text-primary" /> Training per week
                </CardTitle>
                <CardDescription>7-day windows ending today.</CardDescription>
              </div>
              {toggle({ param: "training", current: training, options: [{ value: "sessions", label: "Sessions" }, { value: "minutes", label: "Minutes" }, { value: "volume", label: "Volume" }] })}
            </CardHeader>
            <CardContent>
              <WorkoutsChart data={weekly} targetPerWeek={profile.daysPerWeek} metric={training} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LineChartIcon className="size-4 text-primary" /> Measurements
              </CardTitle>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(Object.keys(MEASUREMENT_META) as MeasurementMetric[]).map((m) => (
                  <Link key={m} href={qs({ metric: m })} className={cn("rounded-full border px-2.5 py-1 text-xs", metric === m ? "border-primary bg-primary/10 font-medium" : "text-muted-foreground hover:text-foreground")}>
                    {MEASUREMENT_META[m].label}
                  </Link>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <MeasurementsChart data={measurement} metric={metric} />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="lg:sticky lg:top-32">
            <CardHeader>
              <CardTitle className="text-base">Daily check-in</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2">
                <span>{checkInKey === todayKey ? "Today" : formatDayKey(checkInKey)}</span>
                {checkInKey !== todayKey && (
                  <Link href={qs({ date: todayKey })} className="underline-offset-4 hover:underline">
                    back to today
                  </Link>
                )}
                <form action="/progress" method="get" className="flex items-center gap-1.5">
                  <input type="hidden" name="range" value={range} />
                  <input type="hidden" name="metric" value={metric} />
                  <input type="hidden" name="intake" value={intake} />
                  <input type="hidden" name="training" value={training} />
                  <label htmlFor="checkin-date" className="text-xs">Pick a day:</label>
                  <input id="checkin-date" type="date" name="date" defaultValue={checkInKey} max={todayKey} className="h-7 rounded-md border bg-background px-2 text-xs" />
                  <button type="submit" className="rounded-md border px-2 py-1 text-xs hover:bg-muted">Go</button>
                </form>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CheckInForm dayKey={checkInKey} entry={entry} dateLabel={checkInKey === todayKey ? "today" : formatDayKey(checkInKey)} />
            </CardContent>
          </Card>
          <Button variant="ghost" className="mt-3 w-full" nativeButton={false} render={<Link href="/goals" />}>
            Set goals →
          </Button>
        </div>
      </div>
    </div>
  );
}
