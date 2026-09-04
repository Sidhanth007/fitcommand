import { Clock, Dumbbell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DAY_NAMES, EQUIPMENT_LABELS, MUSCLE_LABELS } from "@/lib/engine/options";
import type { ActivePlan } from "@/lib/engine/plan-service";

type Workout = ActivePlan["workouts"][number];

export function WorkoutCard({ workout, highlight = false, showInstructions = false }: { workout: Workout; highlight?: boolean; showInstructions?: boolean }) {
  return (
    <Card className={highlight ? "border-primary/50 ring-2 ring-primary/20" : undefined}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardDescription>{DAY_NAMES[workout.dayOfWeek]}</CardDescription>
          {highlight && <Badge>Today</Badge>}
        </div>
        <CardTitle className="flex items-center gap-2">
          <Dumbbell className="size-4 text-primary" /> {workout.title}
        </CardTitle>
        <div className="flex flex-wrap gap-2 pt-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" /> ~{workout.estMinutes} min
          </span>
          <span>·</span>
          <span>{MUSCLE_LABELS[workout.focus]}</span>
          <span>·</span>
          <span>{workout.exercises.length} exercises</span>
        </div>
      </CardHeader>
      <CardContent>
        <ol className="divide-y">
          {workout.exercises.map((pe, i) => (
            <li key={pe.id} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="text-xs text-muted-foreground tabular-nums">{i + 1}.</span>
                    {pe.exercise.name}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {MUSCLE_LABELS[pe.exercise.muscleGroup]} · {EQUIPMENT_LABELS[pe.exercise.equipment]}
                    {pe.notes ? ` · ${pe.notes}` : ""}
                  </div>
                  {showInstructions && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{pe.exercise.instructions}</p>}
                </div>
                <div className="shrink-0 text-right font-mono text-xs">
                  <div>
                    {pe.sets} × {pe.reps}
                  </div>
                  <div className="text-muted-foreground">rest {pe.restSeconds}s</div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
