import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Flame, Timer, Weight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/dashboard/stat-tile";
import { DeleteWorkoutButton } from "@/components/workouts/delete-workout-button";
import { requireOnboarded } from "@/lib/auth/onboarding";
import { getWorkoutLog, workoutVolume } from "@/lib/tracking/workouts";
import { formatDateTime } from "@/lib/dates";
import { MUSCLE_LABELS } from "@/lib/engine/options";

export const metadata: Metadata = { title: "Workout details" };

export default async function WorkoutDetailPage(props: PageProps<"/workouts/[id]">) {
  const [{ user }, { id }] = await Promise.all([requireOnboarded(), props.params]);
  const log = await getWorkoutLog(user.id, id);
  if (!log) notFound();

  const byExercise = new Map<string, { name: string; muscle: string; sets: typeof log.sets }>();
  for (const s of log.sets) {
    const entry = byExercise.get(s.exerciseId) ?? { name: s.exercise.name, muscle: MUSCLE_LABELS[s.exercise.muscleGroup], sets: [] };
    entry.sets.push(s);
    byExercise.set(s.exerciseId, entry);
  }
  const completed = log.sets.filter((s) => s.completed).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/workouts" className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" /> All workouts
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{log.title}</h1>
          <p className="text-muted-foreground">
            {formatDateTime(log.performedAt)}
            {log.rating ? ` · effort ${log.rating}/5` : ""}
          </p>
        </div>
        <DeleteWorkoutButton id={log.id} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Duration" value={String(log.durationMin)} unit="min" icon={Timer} />
        <StatTile label="Calories (est.)" value={String(log.caloriesBurned ?? 0)} unit="kcal" icon={Flame} />
        <StatTile label="Volume" value={workoutVolume(log.sets).toLocaleString()} unit="kg" hint={`${completed} sets completed`} icon={Weight} />
      </div>

      {[...byExercise.values()].map((ex) => (
        <Card key={ex.name}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{ex.name}</CardTitle>
            <p className="text-xs text-muted-foreground">{ex.muscle}</p>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-normal">Set</th>
                  <th className="py-1 font-normal">Reps / time</th>
                  <th className="py-1 font-normal">Weight</th>
                  <th className="py-1 text-right font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {ex.sets.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="py-1.5 tabular-nums">{s.setNumber}</td>
                    <td className="py-1.5 tabular-nums">{s.durationSec ? `${s.durationSec}s` : s.reps ?? "—"}</td>
                    <td className="py-1.5 tabular-nums">{s.weightKg ? `${s.weightKg} kg` : "—"}</td>
                    <td className="py-1.5 text-right">{s.completed ? "Done" : <span className="text-muted-foreground">Skipped</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}

      {log.notes && (
        <Card>
          <CardContent className="pt-6 text-sm">{log.notes}</CardContent>
        </Card>
      )}
      <Button variant="ghost" nativeButton={false} render={<Link href="/workouts" />}>
        Back to workouts
      </Button>
    </div>
  );
}
