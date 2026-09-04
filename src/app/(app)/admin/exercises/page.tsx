import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActiveSwitch, SearchBox } from "@/components/admin/admin-controls";
import { ExerciseDialog } from "@/components/admin/forms";
import { setExerciseActiveAction } from "@/app/(app)/admin/actions";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { EQUIPMENT_OPTIONS, MUSCLE_LABELS } from "@/lib/engine/options";

export const metadata: Metadata = { title: "Admin · Exercises" };

export default async function AdminExercisesPage(props: PageProps<"/admin/exercises">) {
  const [, sp] = await Promise.all([requireAdmin(), props.searchParams]);
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const exercises = await db.exercise.findMany({
    where: q ? { name: { contains: q, mode: "insensitive" } } : {},
    orderBy: [{ isActive: "desc" }, { muscleGroup: "asc" }, { name: "asc" }],
    include: { _count: { select: { planExercises: true, setLogs: true } } },
  });
  const muscles = Object.entries(MUSCLE_LABELS).map(([value, label]) => ({ value, label }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{exercises.length} exercises. Hidden exercises are skipped when generating new plans.</p>
        <div className="flex items-center gap-2">
          <Suspense>
            <SearchBox placeholder="Search exercises…" />
          </Suspense>
          <ExerciseDialog muscles={muscles} equipment={EQUIPMENT_OPTIONS} />
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-normal">Exercise</th>
                  <th className="px-4 py-2 font-normal">Muscle</th>
                  <th className="px-4 py-2 font-normal">Equipment</th>
                  <th className="px-4 py-2 font-normal">Level</th>
                  <th className="px-4 py-2 text-right font-normal">MET</th>
                  <th className="px-4 py-2 text-right font-normal">Used</th>
                  <th className="px-4 py-2 text-right font-normal">Active</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {exercises.map((e) => (
                  <tr key={e.id} className={!e.isActive ? "opacity-60" : undefined}>
                    <td className="px-4 py-2">
                      <div className="font-medium">{e.name}</div>
                      <div className="line-clamp-1 max-w-md text-xs text-muted-foreground">{e.instructions}</div>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{MUSCLE_LABELS[e.muscleGroup]}</td>
                    <td className="px-4 py-2 text-muted-foreground">{EQUIPMENT_OPTIONS.find((o) => o.value === e.equipment)?.label}</td>
                    <td className="px-4 py-2">
                      <Badge variant="outline">{e.difficulty.toLowerCase()}</Badge>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{e.metValue}</td>
                    <td className="px-4 py-2 text-right text-xs tabular-nums text-muted-foreground">
                      {e._count.planExercises} plans · {e._count.setLogs} sets
                    </td>
                    <td className="px-4 py-2 text-right">
                      <ActiveSwitch checked={e.isActive} label={`Enable ${e.name}`} id={e.id} action={setExerciseActiveAction} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <ExerciseDialog muscles={muscles} equipment={EQUIPMENT_OPTIONS} v={{ ...e }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
